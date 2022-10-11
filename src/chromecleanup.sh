#!/bin/bash

for i in $(pgrep -f chrome)
do
    TIME=$(ps --no-headers -o etimes $i)
    if [ "$TIME" -ge 300 ] ; then
        echo $i
        kill $i
    fi
done

