FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY Requirements.txt .
RUN pip install --no-cache-dir -r Requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

# Expose port
EXPOSE 8080

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]