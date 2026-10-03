import { integrations } from "@/config/integrations";
import { siteConfig } from "@/config/site";
import type { SeoPageDefinition } from "@/config/types";

const privacyServices: string[] = [];
if (integrations.analytics.provider === "google-analytics") {
  privacyServices.push("Google Analytics 4 is enabled to understand aggregate page usage. Google may process technical visit information under its own privacy terms.");
}
if (integrations.ads.provider === "adsterra-native") {
  privacyServices.push("Adsterra Native advertising is enabled. Adsterra may process technical request information and applies its own privacy policy.");
}

function legal(slug: string, navLabel: string, heading: string, lead: string, sections: SeoPageDefinition["sections"], relatedSlugs: string[]): SeoPageDefinition {
  return {
    enabled: true, slug, pageType: "legal", navLabel, title: heading,
    description: lead, keywords: [], primaryKeyword: heading.toLowerCase(),
    secondaryKeywords: [], searchIntent: lead, priority: "P2", navVisible: false,
    hero: { heading, lead }, sections, relatedSlugs, lastReviewed: "2026-10-03",
  };
}

export const legalPages: SeoPageDefinition[] = [
  legal("about", "About", "About Dream Car Collection Wiki", "An independent, fan-made guide to Dream Car Collection on Roblox.", [
    { id: "wiki", heading: "About This Wiki", paragraphs: ["Dream Car Collection Wiki helps players find current codes and understand Lucky Crates, cars, Collection income, and the Drive World event. Start on the homepage or choose one of the six main guides."] },
    { id: "independence", heading: "Independent Fan Guide", paragraphs: ["This website is not affiliated with Roblox or F Students = Inventors. The developer's official Roblox game page is the place to launch the game and see its current announcements."] },
    { id: "beta", heading: "A Game in Beta", paragraphs: ["Dream Car Collection is in beta. Menus, codes, features, and balance values can change. Check the current game interface for the values that apply to your session."] },
  ], ["copyright", "terms"]),
  legal("privacy", "Privacy", "Privacy Policy", "Privacy information for Dream Car Collection Wiki and its enabled services.", [
    { id: "site-data", heading: "Site Data", paragraphs: ["This website does not offer accounts, comments, or forms for visitor submissions. The hosting service may process technical request information, such as IP addresses and browser details, to serve pages."] },
    { id: "services", heading: "Third-Party Services", paragraphs: privacyServices.length ? privacyServices : ["No audience measurement or advertising integration is currently enabled."] },
    { id: "external", heading: "External Links", paragraphs: ["Links to Roblox and other websites take you to services with their own privacy policies and terms. This wiki does not receive your Roblox login details."] },
    { id: "changes", heading: "Policy Changes", paragraphs: ["This policy may change if the site's services or data practices change. The review date on this page identifies its latest revision."] },
  ], ["terms", "about"]),
  legal("terms", "Terms", "Terms of Use", "Terms for using the guides and information on Dream Car Collection Wiki.", [
    { id: "information", heading: "Game Information", paragraphs: ["These guides are provided for general game information. Features and codes may change as the game is updated. Use the live game interface for current purchases, values, and reward messages."] },
    { id: "availability", heading: "Accuracy and Availability", paragraphs: ["We aim to keep the guides useful and current, but cannot guarantee uninterrupted access or that every detail remains accurate after a game update."] },
    { id: "use", heading: "Acceptable Use", paragraphs: ["Do not interfere with access to the site or reproduce substantial original content without permission. Roblox gameplay is subject to Roblox's own terms."] },
  ], ["privacy", "copyright"]),
  legal("copyright", "Copyright", "Copyright and Attribution", "Information about original content, game assets, and trademarks on Dream Car Collection Wiki.", [
    { id: "content", heading: "Original Content", paragraphs: ["Original guide text and site organization are protected by copyright unless a separate license states otherwise."] },
    { id: "rights", heading: "Game and Platform Rights", paragraphs: ["Dream Car Collection game names, artwork, and related assets belong to their respective owners. Roblox names and trademarks belong to their respective owners. Their use on this fan-made guide does not imply endorsement."] },
  ], ["about", "terms"]),
];

if (siteConfig.contact.email || siteConfig.contact.url) {
  legalPages.push(legal("contact", "Contact", "Contact", "Contact the Dream Car Collection Wiki team about corrections or site questions.", [
    { id: "contact", heading: "How to Reach Us", paragraphs: ["Use the contact link in the footer. Include the affected page URL and a clear description of your correction or question."] },
  ], ["about", "copyright"]));
}
