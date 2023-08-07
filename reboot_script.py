import os
import time


def reboot_raspberry_pi():
    print("Rebooting Raspberry Pi...")
    os.system("sudo reboot")


def main():
    # Wait for 12 hours before the next reboot
    time.sleep(12 * 60 * 60)

    reboot_raspberry_pi()


if __name__ == "__main__":
    main()
