# portfolio_api/projects/AppConfig.py

import logging
import os

import requests
from apscheduler.schedulers.background import BackgroundScheduler
from django.apps import AppConfig

logger = logging.getLogger(__name__)

class ProjectsConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'projects'

	def ready(self):
		# Don't start scheduler in Django's development server autoreload process
		if os.environ.get('RUN_MAIN') != 'true':
			from django.conf import settings

			def check_services_health():
				"""Ping other services to keep them alive"""
				services = {
					"terminal": os.environ.get("TERMINAL_SERVICE_URL", "https://portfolio-terminal-4t9w.onrender.com"),
					"frontend": os.environ.get("FRONTEND_URL", "https://aouichou.me")
				}

				for name, url in services.items():
					try:
						if url.startswith("wss://"):
							http_url = url.replace("wss://", "https://")
						else:
							http_url = url

						response = requests.get(f"{http_url}/healthz", timeout=5)
						logger.info(f"Health check to {name}: {response.status_code}")
					except Exception as e:
						logger.error(f"Failed health check to {name}: {str(e)}")

			logger.info("Starting service health check scheduler")
			scheduler = BackgroundScheduler()
			scheduler.add_job(check_services_health, 'interval', minutes=14)
			scheduler.start()