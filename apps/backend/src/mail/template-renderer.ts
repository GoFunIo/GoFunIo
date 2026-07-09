import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import { join } from 'path';

const compiled = new Map<string, HandlebarsTemplateDelegate>();

export function renderMailTemplate(
  name: string,
  context: Record<string, unknown>,
): string {
  let template = compiled.get(name);
  if (!template) {
    const path = join(__dirname, 'templates', `${name}.hbs`);
    template = Handlebars.compile(readFileSync(path, 'utf8'), { strict: true });
    compiled.set(name, template);
  }
  return template(context);
}
