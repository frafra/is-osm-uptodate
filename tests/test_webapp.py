from seleniumbase import BaseCase
from seleniumbase.config import settings

class TestWebapp(BaseCase):
    def open_home(func):
        def wrapper(self, *args, **kwargs):
            self.set_window_size('640', '480')
            self.open("http://localhost:8000")
            self.assert_element("#map path.leaflet-interactive",
                timeout=settings.EXTREME_TIMEOUT)
        return wrapper

    @open_home
    def test_results(self):
        pass

    @open_home
    def test_js_errors(self):
        self.assert_no_js_errors()

    @open_home
    def test_404_errors(self):
        self.assert_no_404_errors()

    @open_home
    def test_tabs(self):
        for button in self.find_elements('#mode input'):
            self.click(button)
            self.assert_no_js_errors()
            self.assert_no_404_errors()
