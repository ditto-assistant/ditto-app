def GetNlpBaseUrl(config: dict):
    """Returns the base url for the NLP server."""
    base_url = f'{config["nlp_server_protocol"]}://{config["nlp_server_ip"]}:{config["nlp_server_port"]}'
    return base_url
