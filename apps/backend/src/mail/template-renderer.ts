import { readdirSync, readFileSync } from 'fs';
import Handlebars from 'handlebars';
import { join } from 'path';

const templatesDir = join(__dirname, 'templates');
const compiled = new Map<string, HandlebarsTemplateDelegate>();
let partialsRegistered = false;

function registerPartials(): void {
  if (partialsRegistered) return;
  for (const file of readdirSync(join(templatesDir, 'partials'))) {
    if (!file.endsWith('.hbs')) continue;
    Handlebars.registerPartial(
      file.replace(/\.hbs$/, ''),
      readFileSync(join(templatesDir, 'partials', file), 'utf8'),
    );
  }
  partialsRegistered = true;
}

export function renderMailTemplate(
  name: string,
  context: Record<string, unknown>,
): string {
  registerPartials();
  let template = compiled.get(name);
  if (!template) {
    const path = join(templatesDir, `${name}.hbs`);
    template = Handlebars.compile(readFileSync(path, 'utf8'));
    compiled.set(name, template);
  }
  return template(context);
}
