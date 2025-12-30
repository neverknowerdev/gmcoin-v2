function withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }),
  );
}

export async function GET() {
  const URL = "https://murujb-ip-102-89-75-118.tunnelmole.net";

  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjkwMDU4NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDZmOUFkMWNkM0RjRjI3MUM2OTY0ZDA2NThkYjU2QjM2ZDYyNDYxM2IifQ",
      payload: "eyJkb21haW4iOiJtdXJ1amItaXAtMTAyLTg5LTc1LTExOC50dW5uZWxtb2xlLm5ldCJ9",
      signature: "YoIbV8kzisLiUiETBkQq4CLG382wN9svkuNVnk/Woft0fN/qbAjeNVE82O/Uge3YTZ97K2T2b7AZywnMwf2Flhs="
    },
    frame: withValidProperties({
      version: "1",
      name: "GMcoin",
      subtitle: "Social-native crypto portfolio tracker",
      description: "Social-native crypto portfolio tracker for Base Mini Apps",
      screenshotUrls: [],
      iconUrl: "https://murujb-ip-102-89-75-118.tunnelmole.net/icon.png",
      splashImageUrl: "https://murujb-ip-102-89-75-118.tunnelmole.net/splash.png",
      splashBackgroundColor: "#ffffff",
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: "finance",
      tags: ["gmcoin", "base", "miniapp", "portfolio"],
      heroImageUrl: "https://murujb-ip-102-89-75-118.tunnelmole.net/hero.png",
      tagline: "Track, compare, and act on your Base assets instantly",
      ogTitle: "GMcoin Mini App",
      ogDescription: "Social-native crypto portfolio tracker for Base Mini Apps",
      ogImageUrl: "https://murujb-ip-102-89-75-118.tunnelmole.net/og.png",
    }),
    baseBuilder: {
      allowedAddresses: ["0x864c0A504da4ef27EE12b8197780e7067133587b"]
    }
  });
}

