import json
from agent import ProgrammerAgentSimulator

def load_html(file_path: str) -> str:
    """Load HTML content from a file."""
    with open(file_path, "r", encoding="utf-8") as file:
        return file.read()

def load_responses(file_path: str) -> list:
    """Load coder responses from a JSON file."""
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)

def save_html(file_path: str, content: str):
    """Save HTML content to a file."""
    with open(file_path, "w", encoding="utf-8") as file:
        file.write(content)

def main():
    # Load the original HTML script
    original_html = load_html("new-html-2024-11-01-19-02-24.html")
    
    # Load the cached coder responses
    coder_responses = load_responses("coder-responses-2024-11-01-20-33-19.json")

    # Initialize the simulator
    simulator = ProgrammerAgentSimulator()

    # Apply the changes
    new_html = simulator.apply_changes(original_html, coder_responses)

    # Save the new HTML to a file
    save_html("processed.html", new_html)

    print("Processed HTML saved to 'processed.html'")

if __name__ == "__main__":
    main() 