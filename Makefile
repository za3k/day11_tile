run-debug:
	flask --debug run
run-demo:
	gunicorn3 -e SCRIPT_NAME=/hackaday/tile --bind 0.0.0.0:8011 app:app
