from seleniumbase import BaseCase

class BaseTest(BaseCase):
    def test_js_errors(self):
        self.open("http://localhost:8000")
        self.assert_no_js_errors()

    def test_404_errors(self):
        self.open("http://localhost:8000")
        self.assert_no_404_errors()
