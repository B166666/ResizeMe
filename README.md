# ReSizeMe

Hello! This app compresses any image or multiple images inside a directory into .avif format.

## Why? 

To achieve smaller image sizes without losing much quality.

Many websites offer this service, so why use this one?
Because here you can **upload an entire folder of images, not just a single image.**

The reason I made this app is that I was working on a web app and needed to compress all the images before hosting it. If I had hosted it without doing this, performance would have dropped significantly.

So instead of uploading images one by one to online image compression websites, I decided to make my

## How?

first the app makes a pixel list of the RGPA from the image(.jpg .png)
then it uses the avif compretion algorithm.

i used the same algorithm in [squoosh](https://github.com/GoogleChromeLabs/squoosh)
so thx!

