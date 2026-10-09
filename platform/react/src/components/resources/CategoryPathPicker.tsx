import { useState } from 'react';
import type { CategoryNode } from '@openpeepshq/common/lib';
import { Button, Input } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';

export interface CategoryPathPickerProps {
  path: string[];
  tree: CategoryNode[];
  onChange: (path: string[]) => void;
}

const NodeList = ({
  nodes,
  selected,
  onSelect,
}: {
  nodes: CategoryNode[];
  selected: string[];
  onSelect: (path: string[]) => void;
}) => (
  <ul className="border-border ml-3 border-l pl-3">
    {nodes.map((node) => {
      const active =
        selected.length === node.path.length &&
        node.path.every((segment, index) => selected[index] === segment);
      return (
        <li key={node.path.join('/')} className="py-0.5">
          <button
            type="button"
            className={`text-sm ${active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSelect(node.path)}
          >
            {node.name}
          </button>
          {node.children.length ? (
            <NodeList
              nodes={node.children}
              selected={selected}
              onSelect={onSelect}
            />
          ) : null}
        </li>
      );
    })}
  </ul>
);

export const CategoryPathPicker = ({
  path,
  tree,
  onChange,
}: CategoryPathPickerProps) => {
  const t = useT();
  const [level, setLevel] = useState('');

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">
        {path.length
          ? path.join(' / ')
          : t('resources.form.uncategorized', {
              defaultValue: 'Uncategorized',
            })}
      </p>
      {tree.length ? (
        <NodeList nodes={tree} selected={path} onSelect={onChange} />
      ) : null}
      <div className="flex gap-2">
        <Input
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          placeholder={t('resources.form.addLevel', {
            defaultValue: 'Add a folder',
          })}
        />
        <Button
          variant="outline"
          action={() => {
            const name = level.trim();
            if (!name) return;
            onChange([...path, name]);
            setLevel('');
          }}
        >
          {t('resources.form.addLevelAction', { defaultValue: 'Add' })}
        </Button>
        {path.length ? (
          <Button variant="ghost" action={() => onChange([])}>
            {t('resources.form.clearPath', { defaultValue: 'Clear' })}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
