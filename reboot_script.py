import os
import subprocess
import time

def get_memory_usage():
    command = "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2 }'"
    output = subprocess.check_output(command, shell=True).decode("utf-8").strip()
    return float(output)

def reboot():
    subprocess.call("sudo reboot", shell=True)

if __name__ == "__main__":
    while True:
        memory_threshold = 85.0

        memory_usage = get_memory_usage()
        if memory_usage >= memory_threshold:
            print("Memory usage is at or above the threshold. Rebooting...")
            reboot()
        else:
            print("Memory usage is below the threshold. No action required.")

        time.sleep(120)
