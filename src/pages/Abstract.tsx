const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];

// Update file validation logic to accept multiple file types
if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload PDF, Word, Excel, or text documents.');
}

// Update user-facing text
const USER_GUIDELINES = 'You can upload multiple document formats, including PDF, Word, Excel, and text files.';
const ERROR_MESSAGE = 'Please make sure your file is in one of the following formats: PDF, Word, Excel, or text.';