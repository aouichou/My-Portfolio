# portfolio_api/Dockerfile

FROM python:3.12-slim

WORKDIR /app

# Copy the media files into a directory that will be used only for prepopulation
COPY media /app/prepopulated_media

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "portfolio_api.wsgi"]