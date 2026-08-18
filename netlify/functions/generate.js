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
      referenceImages = [],
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
      Provider-Agnostic boundary.

      الواجهة لا تعرف أي مزود نستخدم.
      لاحقًا نستطيع استبدال Hugging Face
      بـ Seedream أو Replicate أو غيرهما.
    */

    const finalPrompt = `
${prompt}

Identity image is the authoritative source
for the subject's identity.

Preserve facial identity and natural facial
proportions.

Reference images must NOT transfer the identity
of people appearing inside them.

Use references only as visual guidance.
`;

    /*
      هذا أول اختبار للاتصال بالمزود.
      لا نعتبره بعد النسخة النهائية
      للحفاظ على الهوية أو المراجع المتعددة.
    */

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          inputs: finalPrompt
        })
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

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    const contentType =
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
          "black-forest-labs/FLUX.1-schnell",

        image:
          `data:${contentType};base64,${buffer.toString("base64")}`

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
