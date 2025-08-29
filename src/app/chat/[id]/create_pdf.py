import os
import uuid
import markdown
import tempfile
from typing import List
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_LEFT
from app.services.mssql.database_modals import Message
from app.utils.response_handler import create_http_exception
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, KeepTogether, Flowable


# Custom colors to match chat interface exactly
CHAT_COLORS = {
    'user_bg': colors.Color(0.18, 0.27, 0.55),        # Dark blue background for user
    'user_text': colors.white,                         # White text for user
    'assistant_bg': colors.Color(0.96, 0.96, 0.96),   # Light gray background for assistant
    'assistant_text': colors.Color(0.2, 0.2, 0.2),    # Dark text for assistant
    'timestamp': colors.Color(0.5, 0.5, 0.5),         # Gray timestamp
    'border': colors.Color(0.9, 0.9, 0.9),            # Light border
    'page_bg': colors.white,                           # Page background
}

class MessageBubble(Flowable):
    """Custom flowable for chat message bubbles"""
    
    def __init__(self, content, timestamp, is_user=False, width=None):
        Flowable.__init__(self)
        self.content = content
        self.timestamp = timestamp
        self.is_user = is_user
        self.width = width or (A4[0] - 40*mm)  # Full width minus margins
        self.bubble_width = self.width * 0.75  # Message bubble takes 75% of width
        
    def draw(self):
        canvas = self.canv
        
        # Calculate bubble position
        if self.is_user:
            # User messages on the right
            bubble_x = self.width - self.bubble_width
        else:
            # Assistant messages on the left
            bubble_x = 0
            
        # Draw message bubble background
        canvas.setFillColor(CHAT_COLORS['user_bg'] if self.is_user else CHAT_COLORS['assistant_bg'])
        canvas.roundRect(bubble_x, 20, self.bubble_width, self.height - 25, 8, fill=1, stroke=0)
        
        # Set text color
        canvas.setFillColor(CHAT_COLORS['user_text'] if self.is_user else CHAT_COLORS['assistant_text'])
        
        # Draw content text
        text_x = bubble_x + 12
        text_width = self.bubble_width - 24
        
        # Create paragraph for content
        style = ParagraphStyle(
            'MessageContent',
            fontName='Helvetica',
            fontSize=11,
            leading=14,
            textColor=CHAT_COLORS['user_text'] if self.is_user else CHAT_COLORS['assistant_text'],
            leftIndent=0,
            rightIndent=0
        )
        
        content_para = Paragraph(self.content, style)
        content_para.wrapOn(canvas, text_width, 1000)
        content_height = content_para.height
        
        # Update total height based on content
        self.height = content_height + 50  # Content + padding + timestamp space
        
        # Redraw background with correct height
        canvas.setFillColor(CHAT_COLORS['user_bg'] if self.is_user else CHAT_COLORS['assistant_bg'])
        canvas.roundRect(bubble_x, 20, self.bubble_width, content_height + 30, 8, fill=1, stroke=0)
        
        # Draw content
        content_para.drawOn(canvas, text_x, 35 + content_height - content_para.height)
        
        # Draw timestamp
        canvas.setFillColor(CHAT_COLORS['timestamp'])
        canvas.setFont('Helvetica', 9)
        
        if self.is_user:
            # Right-aligned timestamp for user
            timestamp_x = bubble_x + self.bubble_width - 12
            canvas.drawRightString(timestamp_x, 5, self.timestamp)
        else:
            # Left-aligned timestamp for assistant
            timestamp_x = bubble_x + 12
            canvas.drawString(timestamp_x, 5, self.timestamp)

def clean_html_for_reportlab(text: str) -> str:
    """Convert markdown to plain text for ReportLab compatibility"""
    if not text:
        return ""
    
    try:
        # Convert markdown to HTML first
        html_content = markdown.markdown(text, extensions=['fenced_code', 'tables', 'nl2br'])
        
        # Remove all HTML tags and keep just the text content
        # Use a simple approach to strip HTML tags
        import re
        clean_text = re.sub(r'<[^>]+>', '', html_content)
        
        # Clean up extra whitespace
        clean_text = re.sub(r'\n\s*\n', '\n\n', clean_text)
        clean_text = clean_text.strip()
        
        return clean_text
        
    except Exception as e:
        return str(text)

def cleanup_temp_file(file_path: str):
    """Clean up temporary file"""
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
        else:
            print(f"Temporary file not found for deletion: {file_path}")
    except Exception as e:
        print(f"Failed to delete temporary file {file_path}: {str(e)}")

def format_timestamp(timestamp_str: str) -> str:
    """Format timestamp to match chat interface style"""
    try:
        if isinstance(timestamp_str, datetime):
            timestamp = timestamp_str
        else:
            # Handle various timestamp formats
            if 'T' in str(timestamp_str):
                timestamp = datetime.fromisoformat(str(timestamp_str).replace('Z', '+00:00'))
            else:
                timestamp = datetime.fromisoformat(str(timestamp_str))
        
        # Format like "09:56 AM Aug 11, 2025"
        return timestamp.strftime("%I:%M %p %b %d, %Y")
    except Exception as e:
        return str(timestamp_str)

def create_message_bubble(role: str, content: str, timestamp: str, styles: dict) -> KeepTogether:
    """Create a properly styled message bubble"""
    try:
        
        # Clean and format content
        cleaned_content = clean_html_for_reportlab(content)
        formatted_timestamp = format_timestamp(timestamp)
        
        # Determine if this is a user message
        is_user = role.lower() in ["user", "human", "human_message"]
        
        # Create message bubble using table for better control
        page_width = A4[0] - 40*mm  # Page width minus margins
        bubble_width = page_width * 0.7  # 70% of page width for bubble
        
        # Create content paragraph
        if is_user:
            content_style = styles['user_content']
            bg_color = CHAT_COLORS['user_bg']
        else:
            content_style = styles['assistant_content'] 
            bg_color = CHAT_COLORS['assistant_bg']
        
        content_para = Paragraph(cleaned_content, content_style)
        timestamp_para = Paragraph(formatted_timestamp, styles['timestamp'])
        
        if is_user:
            # User messages: right-aligned with dark blue background
            spacer_width = page_width - bubble_width
            data = [
                ['', content_para],
                ['', timestamp_para]
            ]
            col_widths = [spacer_width, bubble_width]
            table_style = [
                ('BACKGROUND', (1, 0), (1, 0), bg_color),
                ('PADDING', (1, 0), (1, 0), 15),
                ('PADDING', (1, 1), (1, 1), (15, 2, 15, 8)),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (1, 0), (1, 0), 'LEFT'),
                ('ALIGN', (1, 1), (1, 1), 'RIGHT'),
                ('ROUNDEDCORNERS', (1, 0), (1, 0), 8),
                ('LEFTPADDING', (1, 0), (1, 0), 12),
                ('RIGHTPADDING', (1, 0), (1, 0), 12),
            ]
        else:
            # AI messages: left-aligned with light gray background
            data = [
                [content_para, ''],
                [timestamp_para, '']
            ]
            col_widths = [bubble_width, page_width - bubble_width]
            table_style = [
                ('BACKGROUND', (0, 0), (0, 0), bg_color),
                ('PADDING', (0, 0), (0, 0), 15),
                ('PADDING', (0, 1), (0, 1), (15, 2, 15, 8)),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (0, 1), (0, 1), 'LEFT'),
                ('ROUNDEDCORNERS', (0, 0), (0, 0), 8),
                ('LEFTPADDING', (0, 0), (0, 0), 12),
                ('RIGHTPADDING', (0, 0), (0, 0), 12),
            ]
        
        table = Table(data, colWidths=col_widths, style=table_style)
        
        # Add more spacing between messages for better visual separation
        return KeepTogether([table, Spacer(1, 20)])
        
    except Exception as e:
        raise

def create_pdf_from_messages(messages: List[Message], conversation_id: uuid.UUID) -> str:
    """Create a beautifully styled PDF from chat messages"""
    try:
        # Validate messages
        if not isinstance(messages, list):
            raise ValueError("Messages must be a list")
        
        # Create a temporary file for the PDF
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        file_path = temp_file.name

        # Set up the PDF document with proper margins
        doc = SimpleDocTemplate(
            file_path, 
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=25*mm,
            bottomMargin=25*mm
        )
        
        # Get base styles
        base_styles = getSampleStyleSheet()

        # Define custom styles matching chat interface
        custom_styles = {
            'title': ParagraphStyle(
                name='ChatTitle',
                parent=base_styles['Title'],
                fontName='Helvetica-Bold',
                fontSize=20,
                textColor=colors.black,
                spaceAfter=25,
                alignment=TA_LEFT
            ),
            'user_content': ParagraphStyle(
                name='UserContent',
                parent=base_styles['Normal'],
                fontName='Helvetica',
                fontSize=11,
                textColor=CHAT_COLORS['user_text'],
                spaceAfter=4,
                leftIndent=0,
                rightIndent=0,
                alignment=TA_LEFT,
                leading=15
            ),
            'assistant_content': ParagraphStyle(
                name='AssistantContent',
                parent=base_styles['Normal'],
                fontName='Helvetica',
                fontSize=11,
                textColor=CHAT_COLORS['assistant_text'],
                spaceAfter=4,
                leftIndent=0,
                rightIndent=0,
                alignment=TA_LEFT,
                leading=15
            ),
            'timestamp': ParagraphStyle(
                name='Timestamp',
                parent=base_styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                textColor=CHAT_COLORS['timestamp'],
                spaceAfter=0
            ),
            'conversation_info': ParagraphStyle(
                name='ConversationInfo',
                parent=base_styles['Normal'],
                fontName='Helvetica-Oblique',
                fontSize=10,
                textColor=colors.Color(0.4, 0.4, 0.4),
                spaceAfter=30,
                alignment=TA_LEFT
            )
        }

        # Build the PDF content
        story = []
        
        # Add title
        story.append(Paragraph("Chat Conversation Export", custom_styles['title']))
        
        # Add conversation info
        export_date = datetime.now().strftime('%B %d, %Y at %I:%M %p')
        story.append(Paragraph(
            f"Conversation ID: {str(conversation_id)}<br/>Export Date: {export_date}",
            custom_styles['conversation_info']
        ))

        # Process and add messages
        processed_count = 0
        
        # Debug: Log first message structure
        if messages:
            first_msg = messages[0]
        
        for idx, message in enumerate(messages):
            try:
                
                # Extract message properties safely
                role = getattr(message, 'MessageType', None)
                content = getattr(message, 'Content', None)
                timestamp = getattr(message, 'CreatedAt', None)
                
                # Validate required fields
                if not role or not content or timestamp is None:
                    continue
                
                # Skip empty messages
                if not str(content).strip():
                    continue
                
                # Debug logging
                
                # Create styled message bubble
                message_bubble = create_message_bubble(role, str(content), timestamp, custom_styles)
                story.append(message_bubble)
                processed_count += 1
                
            except Exception as e:
                continue

        # Add summary if no messages were processed
        if processed_count == 0:
            story.append(Paragraph("No messages found in this conversation.", custom_styles['conversation_info']))


        # Build and save the PDF
        doc.build(story)
        return file_path

    except Exception as e:
        print(f"Error in create_pdf_from_messages: {str(e)}")
        raise create_http_exception(
            status_code=500,
            error_message="Failed to generate PDF",
            exception_message=str(e)
        )