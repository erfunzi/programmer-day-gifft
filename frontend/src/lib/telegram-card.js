// Translate only the export snapshot; the user's page and saved language stay intact.
export function prepareTelegramCard(card, narrative, data, holiday) {
  if (!narrative?.role) throw new Error('English card content is not ready.');
  card.lang = 'en';
  card.dir = 'ltr';
  const text = (selector, value) => { const node = card.querySelector(selector); if (node) node.textContent = value; };
  text('.card-top>span', 'DEVELOPER CARD');
  text('.card-edition', holiday ? 'DAY 256' : `${new Date().getFullYear()} EDITION`);
  text('.role', narrative.role);
  text('.character-class', narrative.role);
  card.querySelector('.card-celebration').dir = 'ltr';
  text('.card-celebration>span', narrative.sloganLead);
  text('.card-celebration h3', `${narrative.slogan}.`);
  const traits = card.querySelector('.character-traits');
  traits.replaceChildren(...(narrative.traits || []).map(value => {
    const span = document.createElement('span'); span.textContent = value; return span;
  }));
  card.querySelectorAll('.rating-item').forEach((node, i) => {
    node.title = data.rating.fields[i].label;
    node.querySelector('span').textContent = data.rating.fields[i].label;
  });
  const values = [data.user.public_repos || 0, data.stars || 0, data.user.followers || 0];
  card.querySelectorAll('.stats>div').forEach((node, i) => {
    node.querySelector('b').textContent = Number(values[i]).toLocaleString('en-US');
    node.querySelector('span').textContent = ['public projects', 'project stars', 'followers'][i];
  });
  text('.card-foot>div>span', `BUILDING SINCE ${new Date(data.user.created_at).getUTCFullYear()}`);
  text('.card-foot small', 'KEEP BUILDING. STAY CURIOUS.');
}
