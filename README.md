# Cryptokitty API
NodeJS API to generate Cute CryptoKitties Images with custom Kattributes 😉

How to run
-----------
<a href="http://computers.pk:3010">http://computers.pk:3010</a>

```shell
npm run post
sudo chmod -R 755 resources __tmp
```
API Endpoints
-----------
- Cattributes List:     <b>GET</b> <tt>/</tt>
- Create Kitty:         <b>POST</b> <tt>/kitty</tt>
```
{
    "cattributes" : {
      "BodyType": "chartreux",
      "PatternType": "tigerpunk",
      "EyeType": "fabulous",
      "MouthType": "beard",
      "Primary": "aquamarine",
      "Secondary": "granitegrey",
      "Tertiary": "royalpurple",
      "EyeColor": "topaz"
    }
}
```
