import os
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from dotenv import load_dotenv
from google.cloud.firestore_v1.vector import Vector


# Load environment variables from .env file
load_dotenv()

# Get the path to the service account file from environment variables
service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT')

# Initialize Firebase Admin with the service account file
cred = credentials.Certificate(service_account_path)
firebase_admin.initialize_app(cred)

# Get a Firestore client
db = firestore.client()

def get_user_conversations(user_id):
    try:
        # Create reference to the nested collection
        conversations_ref = db.collection('memory').document(user_id).collection('conversations')
        
        # Get all documents in the conversations collection
        docs = conversations_ref.stream()
        
        # Print each conversation document
        conversation_count = 0
        for doc in docs:
            conversation_count += 1
            print(f"Conversation ID: {doc.id}")
            print("Data:", doc.to_dict())
            print("-" * 50)
        
        print(f"\nTotal conversations found for user {user_id}: {conversation_count}")
            
    except Exception as e:
        print(f"Error getting conversations: {e}")

def update_user_conversations(user_id):
    try:
        # Create reference to the nested collection
        conversations_ref = db.collection('memory').document(user_id).collection('conversations')
        
        # Get all documents in the conversations collection
        docs = conversations_ref.stream()
        
        # Update each conversation document
        for doc in docs:
            doc_data = doc.to_dict()
            
            # Check if the document has an "embedding" field
            if "embedding" in doc_data:
                # Convert the "embedding" field to a Vector object
                doc_data["embedding"] = Vector(doc_data["embedding"])
                
                # Create a new document with the corrected Vector type
                conversations_ref.document(doc.id).set(doc_data)
                print(f"Updated document {doc.id} for user {user_id}")
            else:
                print(f"No embedding found for document {doc.id} for user {user_id}")
        
        print(f"Finished updating conversations for user {user_id}")
        
    except Exception as e:
        print(f"Error updating conversations: {e}")

if __name__ == "__main__":
    # Replace with actual user ID
    user_id = "FBRvXjguXdYv4nEtgMviZ1dOmRm1"
    get_user_conversations(user_id)
    update_user_conversations(user_id)