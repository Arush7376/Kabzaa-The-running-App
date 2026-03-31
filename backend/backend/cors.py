class SimpleCorsMiddleware:
    """
    Minimal CORS support for Expo web during local development.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = self._build_preflight_response()
        else:
            response = self.get_response(request)

        origin = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Vary"] = "Origin"
        return response

    @staticmethod
    def _build_preflight_response():
        from django.http import HttpResponse

        return HttpResponse(status=200)
