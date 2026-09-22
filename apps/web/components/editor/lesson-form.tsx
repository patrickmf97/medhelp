import { buttonClassName } from '@medhelp/ui';
import type { EditorialLesson, CatalogOption } from '@/lib/content/repository';

export function LessonForm({
  action,
  lesson,
  modules,
}: {
  action: (formData: FormData) => void | Promise<void>;
  lesson?: EditorialLesson;
  modules: CatalogOption[];
}) {
  return (
    <form action={action} className="editor-form">
      <div className="editor-form__grid">
        <label className="mh-field editor-form__wide">
          <span className="mh-field__label">Título</span>
          <input className="mh-field__input" defaultValue={lesson?.title} maxLength={180} name="title" required />
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Slug</span>
          <input className="mh-field__input" defaultValue={lesson?.slug} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Módulo</span>
          <select className="mh-field__input" defaultValue={lesson?.module_id} name="moduleId" required>
            <option value="">Selecione</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.disciplines?.cycles?.title} · {module.disciplines?.title} · {module.title}
              </option>
            ))}
          </select>
        </label>
        <label className="mh-field editor-form__wide">
          <span className="mh-field__label">Resumo</span>
          <textarea className="mh-field__input" defaultValue={lesson?.summary ?? ''} maxLength={2000} name="summary" rows={5} />
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Acesso</span>
          <select className="mh-field__input" defaultValue={lesson?.access_level ?? 'premium'} name="accessLevel">
            <option value="free">Gratuito</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Ordem</span>
          <input className="mh-field__input" defaultValue={lesson?.position ?? 0} min={0} name="position" type="number" />
        </label>
        <label className="mh-field editor-form__wide">
          <span className="mh-field__label">Publicar em (opcional)</span>
          <input
            className="mh-field__input"
            defaultValue={lesson?.scheduled_for?.slice(0, 16) ?? ''}
            name="scheduledFor"
            type="datetime-local"
          />
        </label>
      </div>
      <button className={buttonClassName('primary')} disabled={modules.length === 0} type="submit">
        {lesson ? 'Salvar alterações' : 'Criar aula'}
      </button>
      {modules.length === 0 ? <p className="mh-error-message">Cadastre um módulo no banco antes de criar a primeira aula.</p> : null}
    </form>
  );
}
