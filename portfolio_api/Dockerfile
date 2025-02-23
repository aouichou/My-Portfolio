# portfolio_api/Dockerfile

FROM python:3.12-slim

WORKDIR /app

COPY media/* /app/media_src

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "portfolio_api.wsgi"]