import importlib
import pytest
import sys

sys.path.append("..")
app = importlib.import_module("is-osm-uptodate")

class TestApi:
    def get_data(self):
        return app.getData(
            9.18987035751343,
            45.46393453038024,
            9.19158697128296,
            45.46452522062808,
        )

    def test_json(self):
        data = self.get_data()
        assert 'features' in data
        assert len(data['features']) > 0
        for key in 'geometry type properties'.split():
            for feature in data['features']:
                assert key in feature
