import math


def get_tile(lat, lng, grid_size=0.001):
    """
    Convert latitude/longitude into deterministic tile indices.
    """
    lat_index = math.floor(lat / grid_size)
    lng_index = math.floor(lng / grid_size)
    return lat_index, lng_index
