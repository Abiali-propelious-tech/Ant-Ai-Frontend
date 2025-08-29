from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from fastapi.responses import FileResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Frame
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus.flowables import Flowable
import markdown
from datetime import datetime
import tempfile
import uuid
import os
import re
from typing import List, Dict
from app.utils.response_handler import create_http_exception
from app.services.mssql.service import DatabaseService
from app.services.mssql.dependencies import get_database_service
from app.middleware.auth import get_jwt_token
from app.services.mssql.database_modals import Message
from app.utils.create_pdf import create_pdf_from_messages, cleanup_temp_file

router = APIRouter()

@router.get("/export-chat-or-summary")
async def export_chat_or_summary(
    background_tasks: BackgroundTasks,
    conversation_id: uuid.UUID = Query(..., description="ID of the conversation"),
    db_service: DatabaseService = Depends(get_database_service),
    user: dict = Depends(get_jwt_token),
):
    """
    Export chat or summary for a conversation as a beautifully styled PDF file.
    """
    file_path = None
    try:
        # Validate user
        user_id = user.get("UserId", "")
        if not user_id:
            raise create_http_exception(
                status_code=status.HTTP_401_UNAUTHORIZED,
                error_message="User not found"
            )

        # Fetch conversation
        conversation = db_service.get_conversation_by_id(conversation_id)
        if not conversation:
            raise create_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                error_message="Conversation not found"
            )

        # Validate conversation ownership
        if conversation.UserId != user_id:
            raise create_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                error_message="Not authorized to access this conversation"
            )

        # Fetch messages
        messages = db_service.get_messages_by_conversation_id(conversation_id)
        if not messages:
            raise create_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                error_message="Messages not found"
            )

        # Create PDF file
        file_path = create_pdf_from_messages(messages, conversation_id)

        # Verify file exists and is readable
        if not os.path.exists(file_path):
            raise create_http_exception(
                status_code=500,
                error_message="Generated PDF file not found",
                exception_message=f"File {file_path} does not exist"
            )
        if not os.access(file_path, os.R_OK):
            raise create_http_exception(
                status_code=500,
                error_message="Generated PDF file is not readable",
                exception_message=f"File {file_path} lacks read permissions"
            )

        # Return the PDF as a downloadable file
        # Schedule file cleanup as a background task
        background_tasks.add_task(cleanup_temp_file, file_path)
        
        return FileResponse(
            path=file_path,
            media_type='application/pdf',
            filename=f"chat_export_{conversation_id}.pdf",
            headers={"Content-Disposition": f"attachment; filename=chat_export_{conversation_id}.pdf"}
        )

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise create_http_exception(
            status_code=500,
            error_message="PDF file not found",
            exception_message=str(e)
        )
    except PermissionError as e:
        raise create_http_exception(
            status_code=500,
            error_message="Permission denied accessing PDF file",
            exception_message=str(e)
        )
    except Exception as e:
        raise create_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_message="Error exporting chat or summary",
            exception_message=str(e)
        )
    finally:
        # Only clean up if the file wasn't scheduled for background cleanup
        if file_path and 'background_tasks' not in locals():
            cleanup_temp_file(file_path)