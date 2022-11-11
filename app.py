#!/bin/python3
import flask, flask_login
from flask import url_for, request, render_template, redirect
from flask_login import current_user
import json
from datetime import datetime
from base import app,load_info,ajax,DBDict,DBList,random_id,hash_id

# -- Info for every Hack-A-Day project --
load_info({
    "project_name": "Hack-A-Tile",
    "source_url": "https://github.com/za3k/day11_tile",
    "subdir": "/hackaday/tile",
    "description": "tile placing game",
    "login": False,
})

# -- Routes specific to this Hack-A-Day project --
@app.route("/")
def index():
    return flask.render_template('index.html')
