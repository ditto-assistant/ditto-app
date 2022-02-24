"""
handles messages from clients around the LAN / house.

"""

import asyncio, socket

class Server:

    def __init__(self):
        pass

    async def handle_client(self, reader, writer):
        print('got message')
        request = None
        while request != 'quit':
            request = (await reader.read(255)).decode('utf8')
            response = str(eval(request)) + '\n'
            writer.write(response.encode('utf8'))
            await writer.drain()
        writer.close()

    async def loop(self):
        # sleep time
        await asyncio.sleep(12 * 0.001)

    async def run_server(self):
        server = await asyncio.start_server(self.handle_client, '192.168.1.3', 42042)
        async with server:
            await self.loop()

    def start_server(self):
        asyncio.run(self.run_server())

if __name__ == "__main__":
    
    server = Server()
    while True:
        server.start_server()
