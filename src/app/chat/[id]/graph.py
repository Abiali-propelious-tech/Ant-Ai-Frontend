from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langgraph.graph import END, StateGraph, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from app.utils.model_selector import get_model, ProviderEnum
from app.ai_core.rag.pipeline import RAGPipeline
from app.services.mssql.mssql_saver import AsyncMSSQLSaver
from typing import Optional, List
from pydantic import BaseModel, Field
from langchain_core.documents import Document

class Citation(BaseModel):
    source: List[str] = Field(
        ...,
        description="The list of turn IDs which justifies the answer.",
    )
    quote: str = Field(
        ...,
        description="The VERBATIM quote from the specified source that justifies the answer.",
    )

class ChatState(MessagesState):
    file_ids: List[str]
    model: str
    provider: ProviderEnum
    context: List[Document] 
    citations: List[Citation]

graph_builder = StateGraph(ChatState)

@tool(response_format="content_and_artifact")
async def retrieve_chunks(query: str, file_ids: List[str]):
    """Retrieve information related to a query. Take query and file_ids as input and return the content of the documents."""
    rag_pipeline = RAGPipeline(file_ids=file_ids)
    retrieved_docs = rag_pipeline.retrieval(
        query,
        search_type="similarity_score_threshold",
        search_kwargs={
            "filter": {"source": {"$in": file_ids}},
            "score_threshold": 0.5,
        },
    )
    serialized = "\n\n".join(
        (
            f"Document {i}\nContent: {doc.page_content}\nSource: {[turn['turn_id'] for turn in doc.metadata['turns']]}"
            for i, doc in enumerate(retrieved_docs, 1)
        )
    )
    return serialized, retrieved_docs

@tool(response_format="content_and_artifact")
async def retrieve_docs(file_ids: List[str]):
    """Retrieve the complete document/transcript content for analysis. Take file_ids as input and return the content of the documents."""
    rag_pipeline = RAGPipeline(file_ids=file_ids)
    documents = []
    for file_id in file_ids:
        document = rag_pipeline.retrieve_file_content(file_id)
        if document:
            documents.append(document)

    # Add Document <No> headers
    numbered_docs = [f"Document {i}\n{doc}" for i, doc in enumerate(documents, 1)]

    return "\n\n".join(numbered_docs), documents


# Step 1: Generate an AIMessage that may include a tool-call to be sent.
async def query_or_respond(state: ChatState):
    """Generate tool call for retrieval or respond."""
    llm = get_model(state["model"], state["provider"])
    llm_with_tools = llm.bind_tools([retrieve_chunks, retrieve_docs])
    
        # Add system message to instruct the LLM to use tools
    file_ids_str = str(state["file_ids"])
    system_message = SystemMessage(content=f"""You are a helpful assistant that can retrieve information from documents. 
    When a user asks a question, you should use the available tools to retrieve relevant information from the documents before answering.
    Use the retrieve_chunks tool to search for specific information related to the query. You must pass both the query and file_ids parameters.
    Use the retrieve_docs tool to get complete document content when you need to analyze the full context. You must pass the file_ids parameter.
    The file_ids are: {file_ids_str}
    Always try to use the tools to provide accurate, evidence-based answers rather than making assumptions.""")
    
    messages_with_system = [system_message] + state["messages"]
    response = await llm_with_tools.ainvoke(messages_with_system)
    # MessagesState appends messages to state instead of overwriting
    return {"messages": [response]}


# Step 2: Execute the retrieval.
tools = ToolNode([retrieve_chunks, retrieve_docs])


# Step 3: Generate a response using the retrieved content.
async def generate(state: ChatState):
    """Generate answer and replace context with new documents."""
    recent_tool_messages = []
    for message in reversed(state["messages"]):
        if message.type == "tool":
            recent_tool_messages.append(message)
        else:
            break
    tool_messages = recent_tool_messages[::-1]

    # Extract documents from ToolMessage artifacts
    context = []
    for tool_message in tool_messages:
        if tool_message.artifact:
            if isinstance(tool_message.artifact, list):
                print('I am in list')
                context.extend(tool_message.artifact)
            elif isinstance(tool_message.artifact, Document):
                print('I am in document')
                context.append(tool_message.artifact)

    # Format into prompt
    docs_content = "\n\n".join(doc.content for doc in tool_messages)
    system_message_content = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you "
        "don't know. Use three sentences maximum and keep the "
        "answer concise."
        "\n\n"
        f"{docs_content}"
    )
    conversation_messages = [
        message
        for message in state["messages"]
        if message.type in ("human", "system")
        or (message.type == "ai" and not message.tool_calls)
    ]
    prompt = [SystemMessage(system_message_content)] + conversation_messages

    # Run
    llm = get_model(state["model"], state["provider"])
    response = await llm.ainvoke(prompt)

    return {
        "messages": [response],
        "context": context  
    }


graph_builder.add_node(query_or_respond)
graph_builder.add_node(tools)
graph_builder.add_node(generate)

graph_builder.set_entry_point("query_or_respond")
graph_builder.add_conditional_edges(
    "query_or_respond",
    tools_condition,
    {END: END, "tools": "tools"},
)
graph_builder.add_edge("tools", "generate")
graph_builder.add_edge("generate", END)

graph = graph_builder.compile()


if __name__ == "__main__":
    import asyncio
    
    async def main():
        initial_state = {
            "messages": [HumanMessage(content="Can you clarify the process for how Xcel Transportation assigns trips to drivers like Mr. Woods and Mr. Jochev?")],
            "file_ids": ["216158f7-7b22-48cd-84a0-159490c0cc5d"],
            "model": "gemini-2.5-flash",
            "provider": ProviderEnum.gemini,
            "context": [],
            "citations": []
        }
        
        # Run the graph
        final_state = await graph.ainvoke(initial_state)
        print(final_state)
    
    # Run the async main function
    asyncio.run(main())
