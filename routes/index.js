var express = require("express");
var path = require("path");
var router = express.Router();
var tools = require("simple-svg-tools");
var cattributes = require("../cattributes");
var fs = require("fs");
var svg2img = require("svg2img");
var uuid = require("uuid4");
var mergeImages = require("../node_modules/merge-images/src/");
var Canvas = require("canvas");
var config = require("../common/config");
var crypto = require("../common/crypto");
var joi = require("joi");

router.get("/", function(req, res, next) {
  res.json({
    status: true,
    message:
      "CryptoKitties is a game centered around breedable, collectible, and oh-so-adorable creatures we call CryptoKitties! Each cat is one-of-a-kind and 100% owned by you; it cannot be replicated, taken away, or destroyed.",
    data: cattributes
  });
});

router.get("/resource/:img_name", async (req, res) => {
  try {
    const imgPath = `${process.cwd()}/resources/${req.params.img_name}`;
    if (fs.existsSync(imgPath)) {
      res.sendFile(imgPath);
    } else {
      throw {
        response_code: 404,
        error_message: "Not Found"
      };
    }
  } catch (err) {
    console.log("Err", err);
    res.status(err.response_code || 400).json({
      status: false,
      error: err.stack || err.error_message,
      data: err
    });
  }
});

router.get("/random-kitty", async (req, res) => {
  try {
    let props = {
      BodyType: randomKey(cattributes.BodyType),
      PatternType: randomKey(cattributes.PatternType),
      EyeType: randomKey(cattributes.EyeType),
      MouthType: randomKey(cattributes.MouthType),
      Primary: randomKey(cattributes.Primary),
      Secondary: randomKey(cattributes.Secondary),
      Tertiary: randomKey(cattributes.Tertiary),
      EyeColor: randomKey(cattributes.EyeColor)
    };
    let data = await generateKitty(props);
    if (req.query.type == "file")
      return res.sendFile(`${process.cwd()}/resources/${data.data.hash}.png`);
    else return res.json(data);
  } catch (err) {
    console.log("Err", err);
    res.status(400).json({
      status: false,
      error: err.name || "An unknown error occoured",
      data: err.details || {}
    });
  }
});
router.post("/kitty", async (req, res) => {
  try {
    const schema = joi.object().keys({
      BodyType: joi
        .string()
        .valid(extractKeys(cattributes.BodyType))
        .required(),
      PatternType: joi
        .string()
        .valid(extractKeys(cattributes.PatternType))
        .required(),
      EyeType: joi
        .string()
        .valid(extractKeys(cattributes.EyeType))
        .required(),
      MouthType: joi
        .string()
        .valid(extractKeys(cattributes.MouthType))
        .required(),
      Primary: joi
        .string()
        .valid(extractKeys(cattributes.Primary))
        .required(),
      Secondary: joi
        .string()
        .valid(extractKeys(cattributes.Secondary))
        .required(),
      Tertiary: joi
        .string()
        .valid(extractKeys(cattributes.Tertiary))
        .required(),
      EyeColor: joi
        .string()
        .valid(extractKeys(cattributes.EyeColor))
        .required()
    });
    // let cattributes = {
    //   BodyType: "chartreux",
    //   PatternType: "totesbasic",
    //   EyeType: "simple",
    //   MouthType: "dali",
    //   Primary: "salmon",
    //   Secondary: "kittencream",
    //   Tertiary: "swampgreen",
    //   EyeColor: "strawberry"
    // };
    let props = await joi.validate(req.body.cattributes, schema);
    let data = await generateKitty(props);
    res.json(data);
  } catch (err) {
    console.log("Err", err);
    res.status(400).json({
      status: false,
      error: err.name || "An unknown error occoured",
      data: err.details || {}
    });
  }
});

async function generateKitty(props) {
  try {
    const hash = uuid();
    let colors = [
      cattributes.Primary[props.Primary],
      cattributes.Secondary[props.Secondary],
      cattributes.Tertiary[props.Tertiary],
      cattributes.EyeColor[props.EyeColor]
    ];

    // Load SVGs
    let kittyImage = await loadImage(
      path.resolve(
        `cattributes/body/${props.BodyType}-${props.PatternType}.svg`
      )
    );
    let kittyEye = await loadImage(
      path.resolve(`cattributes/eye/${props.EyeType}.svg`)
    );
    let kittyMouth = await loadImage(
      path.resolve(`cattributes/mouth/${props.MouthType}.svg`)
    );

    // Detecting Colors
    let bodyColors = detectKittyColors(kittyImage);
    let eyeColors = detectKittyColors(kittyEye);
    let mouthColors = detectKittyColors(kittyMouth);

    if (bodyColors[0]) {
      kittyImage = kittyImage.replace(
        new RegExp(cattributes.Primary[bodyColors[0]], "g"),
        colors[0]
      );
    }
    if (bodyColors[1]) {
      kittyImage = kittyImage.replace(
        new RegExp(cattributes.Secondary[bodyColors[1]], "g"),
        colors[1]
      );
    }

    if (eyeColors[3]) {
      kittyEye = kittyEye.replace(
        new RegExp(cattributes.EyeColor[eyeColors[3]], "g"),
        colors[3]
      );
    }

    if (bodyColors[2]) {
      kittyImage = kittyImage.replace(
        new RegExp(cattributes.Tertiary[bodyColors[2]], "g"),
        colors[2]
      );
    }

    if (mouthColors[0]) {
      kittyMouth = kittyMouth.replace(
        new RegExp(cattributes.Primary[mouthColors[0]], "g"),
        colors[0]
      );
    }

    // Convert SVG to PNG for tmp
    let convData = await Promise.all([
      convertImage(kittyImage, hash, "body"),
      convertImage(kittyEye, hash, "eye"),
      convertImage(kittyMouth, hash, "mouth")
    ]);
    let imgs = [
      convData[0].data.path,
      convData[1].data.path,
      convData[2].data.path
    ];
    // Merge images togather
    let b64 = await mergeImages(imgs, {
      Canvas: Canvas
    });
    var base64Data = b64.replace(/^data:image\/png;base64,/, "");
    const imgPath = `${process.cwd()}/resources/${hash}.png`;
    await saveImage(base64Data, imgPath);
    // Delete temp images
    imgs.map(e => {
      fs.unlink(e, () => {});
    });
    // Send the end result to the user
    return {
      status: true,
      message: "Kitty came to life!",
      data: {
        resource: `${config.base_url}/resource/${hash}.png`,
        hash: hash,
        dna: crypto.encrypt(JSON.stringify(props)),
        cattributes: props
      }
    };
  } catch (err) {
    console.log("Kitty Generation Err", err);
    throw err;
  }
}

function randomKey(obj) {
  let len = 0;
  for (i in obj) len++;
  len--;
  let rand = Math.ceil((Math.random() * 10) % len);
  let index = 0;
  for (i in obj) {
    if (index == rand) return i;
    index++;
  }
}

async function saveImage(base64Data, imgPath) {
  return new Promise((resolve, reject) => {
    fs.writeFile(imgPath, base64Data, "base64", function(err) {
      if (err) {
        return reject({
          status: false,
          error: "Error while saving file",
          data: err
        });
      }
      return resolve({
        status: true,
        message: "File saved",
        data: {
          path: imgPath
        }
      });
    });
  });
}

async function loadImage(svgPath) {
  let kittyImage = await tools.ImportSVG(svgPath);
  return kittyImage.toString();
}

async function convertImage(svgStr, tmpName, type) {
  return new Promise((resolve, reject) => {
    svg2img(svgStr, function(error, buffer) {
      if (error)
        reject({ status: false, error: "Can not convert image", data: error });
      let resPath = `${process.cwd()}/__tmp/${tmpName}-${type}.png`;
      fs.writeFileSync(resPath, buffer);
      resolve({
        status: true,
        message: "Image converted successfully",
        data: { path: resPath }
      });
    });
  });
}

function detectKittyColors(svgText) {
  let c = cattributes;
  const colors = [null, null, null, null];
  for (const color in c.Primary) {
    if (svgText.indexOf(c.Primary[color]) > -1) {
      colors[0] = color;
    }
  }
  for (const color in c.Secondary) {
    if (svgText.indexOf(c.Secondary[color]) > -1) {
      colors[1] = color;
    }
  }
  for (const color in c.Tertiary) {
    if (svgText.indexOf(c.Tertiary[color]) > -1) {
      colors[2] = color;
    }
  }

  for (const color in c.EyeColor) {
    if (svgText.indexOf(c.EyeColor[color]) > -1) {
      colors[3] = color;
    }
  }

  return colors;
}

function extractKeys(obj) {
  let keys = [];
  for (i in obj) {
    keys.push(i);
  }
  return keys;
}

module.exports = router;
