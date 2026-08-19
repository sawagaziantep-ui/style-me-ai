exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method Not Allowed"
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      identityImage,
      prompt = ""
    } = body;

    if (!identityImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Identity image is required"
        })
      };
    }

    const token = process.env.HF_TOKEN;

    if (!token) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "HF_TOKEN is not configured"
        })
      };
    }

    /*
      Provider-Agnostic configuration
    */

    const MODEL =
      "black-forest-labs/FLUX.1-Kontext-dev";

    /*
      Convert the data URL received from the browser
      into binary image data.
    */

    const match =
      identityImage.match(
        /^data:(image\/[^;]+);base64,(.+)$/
      );

    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid identity image format"
        })
      };
    }

    const contentType = match[1];

    const imageBuffer =
      Buffer.from(match[2], "base64");

    /*
      Strong identity-preservation instructions.
    */

    const finalPrompt = `
Use the provided image as the authoritative source
of the subject's identity.

Preserve the exact identity of the person.

Maintain facial structure, facial proportions,
eyes, nose, mouth, jawline, cheek structure,
skin tone, natural skin texture, hairline,
and natural facial asymmetries.

Do not beautify, redesign, stylize, age,
de-age, masculinize, feminize, or reinterpret
the person's face.

Do not create a lookalike.

The result must clearly represent the same person.

Only modify the visual attributes explicitly
requested by the user.

Maintain realistic human anatomy,
natural skin texture, realistic hair,
and photographic lighting.

User instructions:

${prompt}
`;

    /*
      Hugging Face Inference Providers
      Image-to-Image request.
    */

    const response =
      await fetch(
        `https://router.huggingface.co/hf-inference/models/${MODEL}`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              contentType
          },

          body: imageBuffer
        }
      );

    if (!response.ok) {

      const errorText =
        await response.text();

      return {
        statusCode: response.status,

        body: JSON.stringify({
          error:
            "Hugging Face error: " +
            errorText
        })
      };
    }

    const outputBuffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    const outputType =
      response.headers.get(
        "content-type"
      ) || "image/png";

    return {

      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        provider:
          "huggingface",

        model:
          MODEL,

        image:
          `data:${outputType};base64,${outputBuffer.toString("base64")}`

      })

    };

  } catch (error) {

    return {

      statusCode: 500,

      body: JSON.stringify({
        error:
          error.message ||
          "Unknown server error"
      })

    };

  }
};
