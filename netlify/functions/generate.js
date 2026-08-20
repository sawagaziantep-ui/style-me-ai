const { InferenceClient } = require("@huggingface/inference");

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
    const { identityImage, prompt = "" } =
      JSON.parse(event.body || "{}");

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

    const match = identityImage.match(
      /^data:(image\/[^;]+);base64,(.+)$/
    );

    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid image format"
        })
      };
    }

    const imageBuffer =
      Buffer.from(match[2], "base64");

    const client = new InferenceClient(token);

    const finalPrompt = `
Use the provided image as the authoritative
identity reference.

Preserve the same person.

Preserve facial identity, facial geometry,
facial proportions, eyes, nose, mouth,
jawline, skin tone, natural skin texture,
hairline and natural asymmetry.

Do not create a lookalike.
Do not beautify or redesign the face.
Do not change the person's identity.

Only change the elements requested below.

Maintain realistic anatomy, realistic skin,
natural lighting and photographic detail.

USER REQUEST:
${prompt}
`;

    const output =
      await client.imageToImage({
        model:
          "black-forest-labs/FLUX.1-Kontext-dev",

        inputs: imageBuffer,

        parameters: {
          prompt: finalPrompt
        },

        provider: "auto"
      });

    const outputBuffer =
      Buffer.from(
        await output.arrayBuffer()
      );

    const contentType =
      output.type || "image/png";

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        provider: "auto",
        model:
          "black-forest-labs/FLUX.1-Kontext-dev",

        image:
          `data:${contentType};base64,${outputBuffer.toString("base64")}`
      })
    };

  } catch (error) {

    console.error(error);

    return {
      statusCode: 500,

      body: JSON.stringify({
        error:
          error.message ||
          "Image generation failed"
      })
    };
  }
};
