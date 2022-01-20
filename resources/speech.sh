#!/bin/bash
#################################
# Speech Script by Dan Fountain #
#      TalkToDanF@gmail.com     #
#################################
 
 
INPUT=$*
STRINGNUM=0
 
ary=($INPUT)
for key in "${!ary[@]}" 
  do
    SHORTTMP[$STRINGNUM]="${SHORTTMP[$STRINGNUM]} ${ary[$key]}"
    LENGTH=$(echo ${#SHORTTMP[$STRINGNUM]})
    #echo "word:$key, ${ary[$key]}"
    #echo "adding to: $STRINGNUM"
    if [[ "$LENGTH" -lt "100" ]]; then
      #echo starting new line
      SHORT[$STRINGNUM]=${SHORTTMP[$STRINGNUM]}
    else
      STRINGNUM=$(($STRINGNUM+1))
      SHORTTMP[$STRINGNUM]="${ary[$key]}"
      SHORT[$STRINGNUM]="${ary[$key]}"
    fi
done
 
for key in "${!SHORT[@]}"
  do
    #echo "line: $key is: ${SHORT[$key]}"
 
    NEXTURL=$(echo ${SHORT[$key]} | xxd -plain | tr -d '\n' | sed 's/\(..\)/%\1/g')
    mpg123 -q "http://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=$NEXTURL&tl=En-us"
done
