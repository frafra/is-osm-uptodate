import signal

import shlex
import subprocess

uwsgi_command = shlex.split('uwsgi --ini uwsgi.ini')

def setup_module():
    global uwsgi
    uwsgi = subprocess.Popen(uwsgi_command, cwd='..')
    import time
    time.sleep(3)

def teardown_module():
    global uwsgi
    uwsgi.send_signal(signal.SIGINT)
