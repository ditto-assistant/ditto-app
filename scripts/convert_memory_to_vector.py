import os
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from dotenv import load_dotenv
import firebase_admin.auth
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

def print_all_user_name_and_email():
    try:
        # Get all users from Firebase Authentication
        users = firebase_admin.auth.list_users()
        
        # mailing list csv ensure utf-8 encoding
        with open('mailing_list.csv', 'w', encoding='utf-8') as f:
            f.write("Name,Email\n")
            for user in users.users:
                f.write(f"{user.display_name},{user.email}\n")

        # also make a single .txt with To add contacts manually, just provide a valid email address (e.g john.doe@example.com or "John Doe" <jd@example.com>) syntax
        with open('mailing_list.txt', 'w', encoding='utf-8') as f:
            for user in users.users:
                f.write(f"{user.display_name} <{user.email}>\n")

    except Exception as e:
        print(f"Error getting users: {e}")

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
            
            # Skip if embedding_vector already exists
            if "embedding_vector" in doc_data:
                print(f"Skipping document {doc.id} - embedding_vector already exists")
                continue
                
            # Check if the document has an "embedding" field
            if "embedding" in doc_data:
                try:
                    # Skip if embedding is empty/zero length
                    if not doc_data["embedding"]:
                        print(f"Skipping document {doc.id} - Empty embedding")
                        continue
                        
                    # Convert the "embedding" field to a Vector object
                    doc_data["embedding_vector"] = Vector(doc_data["embedding"])
                    
                    # Create a new document with the corrected Vector type
                    conversations_ref.document(doc.id).set(doc_data)
                    print(f"Updated document {doc.id} for user {user_id}")
                except (ValueError, TypeError) as e:
                    # Skip documents that can't be converted to Vector
                    print(f"Skipping document {doc.id} - Error converting to Vector: {e}")
                    continue
            else:
                print(f"No embedding found for document {doc.id} for user {user_id}")
        
        print(f"Finished updating conversations for user {user_id}")
        
    except Exception as e:
        print(f"Error updating conversations: {e}")


def get_all_user_ids():
    users = firebase_admin.auth.list_users()
    return [user.uid for user in users.users]

if __name__ == "__main__":
    user_ids = get_all_user_ids()
    for user_id in user_ids:
        print(f"Updating conversations for user {user_id}")
        update_user_conversations(user_id)

    # Replace with actual user ID
    # user_id = "zKvN3U5t0MSrWrmFG6ngiUQq2gP2"
    # get_user_conversations(user_id)
    # update_user_conversations(user_id)

    # print_all_user_name_and_email()