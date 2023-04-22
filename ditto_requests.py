
import sqlite3
import time


class DittoRequests():

    def __init__(self) -> None:
        pass

    def check_for_gesture(self):
        '''
        Checks for gesture to skip wake.
        '''
        def reset_counts():
            self.like_count = 0
            self.dislike_count = 0
            self.palm_count = 0

        if time.time() > self.timeout:
            # print('gesture check timeout')
            self.timeout = time.time() + 4
            # reset gesture counters
            reset_counts()
        try:
            SQL = sqlite3.connect(f'ditto.db')
            cur = SQL.cursor()
            req = cur.execute("select * from gestures")
            req = req.fetchall()
            like_gest = False
            dislike_gest = False
            palm_gest = False
            for i in req:
                if 'like' in i:
                    like_gest = True
                    print('like')
                if 'dislike' in i:
                    dislike_gest = True
                    print('dislike')
                if 'palm' in i:
                    print('palm')
                    palm_gest = True
            if like_gest or dislike_gest or palm_gest:
                if like_gest:
                    self.like_count += 1
                if dislike_gest:
                    self.dislike_count += 1
                if palm_gest:
                    self.palm_count += 1

                if self.like_count == 2:
                    reset_counts()
                    print("\n[Activated from Like Gesture]\n")
                    self.running = False
                    self.gesture_activation = True
                    self.gesture = 'like'

                if self.dislike_count == 2:
                    reset_counts()
                    print("\n[Activated from Dislike Gesture]\n")
                    self.running = False
                    self.gesture_activation = True
                    self.gesture = 'dislike'

                if self.palm_count == 2:
                    reset_counts()
                    print("\n[Activated from Palm Gesture]\n")
                    self.running = False
                    self.gesture_activation = True
                    self.gesture = 'palm'
            cur.execute("DELETE FROM gestures")
            SQL.commit()
            SQL.close()
        except BaseException as e:
            pass
            # print(e)
        if self.gesture_activation:
            self.activated = 1

    def check_for_request(self):
        '''
        Checks if the user sent a prompt from the client GUI.
        '''
        try:

            SQL = sqlite3.connect(f'ditto.db')
            cur = SQL.cursor()
            req = cur.execute("select * from ditto_requests")
            req = req.fetchone()
            if req[0] == "prompt":
                self.prompt = req[1]
                print("\n[GUI prompt received]\n")
                cur.execute("DROP TABLE ditto_requests")
                SQL.close()
                self.running = False
                self.inject_prompt = True
                self.activated = 1
            if req[0] == "resetConversation":
                print("\n[Reset conversation request received]\n")
                cur.execute("DROP TABLE ditto_requests")
                SQL.close()
                self.running = False
                self.reset_conversation = True
                self.activated = 1
            if req[0] == "activation":
                print("\n[Ditto activation request received]\n")
                cur.execute("DROP TABLE ditto_requests")
                SQL.close()
                self.running = False
                self.activated = 1

        except BaseException as e:
            pass
            # print(e)

    def poll_for_request(self):
        self.activated = 0
        self.timeout = time.time() + 4  # 4 seconds (used for gesture recognition)
        # set to false to interrupt elsewhere (might remove this)
        self.running = True
        self.prompt = ""  # used for GUI skip wake and skip STT (inject prompt)
        # set to true in check_for_request function to skip STT module
        self.inject_prompt = False
        self.gesture = ""  # grabbed from gesture_recognition module
        # set to true in check_for_gesture function to skip wake using gesture
        self.gesture_activation = False
        self.reset_conversation = False  # set to true in check_for_request
        self.palm_count = 0  # used to filter false positives
        self.like_count = 0
        self.dislike_count = 0
        print('\nidle...\n')
        self.start_time = time.time()
        while True:
            self.check_for_gesture()
            self.check_for_request()
            if self.activated or self.running == False:
                return True


if __name__ == "__main__":

    ditto_requests = DittoRequests()
    wake = ditto_requests.poll_for_request()
