import os
import sys

args = sys.argv
val = args[1]
path = args[2]

os.system('termdown %s && mpg321 -q %s' % (val, path))