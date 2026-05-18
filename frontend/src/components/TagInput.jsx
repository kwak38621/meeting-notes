// frontend/src/components/TagInput.jsx
import { useEffect, useState } from 'react';
import { getTags, createTag } from '../api/tags';
import { addTag, removeTag } from '../api/pages';

export default function TagInput({ pageId, pageTags, onTagsChange }) {
  const [allTags, setAllTags] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    getTags().then((res) => setAllTags(res.data.data));
  }, []);

  const handleAdd = async (tag) => {
    if (pageTags.find((t) => t.id === tag.id)) return;
    const res = await addTag(pageId, tag.id);
    onTagsChange(res.data.data.tags);
  };

  const handleRemove = async (tagId) => {
    const res = await removeTag(pageId, tagId);
    onTagsChange(res.data.data.tags);
  };

  const handleCreate = async (e) => {
    if (e.key === 'Enter' && input.trim()) {
      const res = await createTag(input.trim());
      const newTag = res.data.data;
      setAllTags([...allTags, newTag]);
      await handleAdd(newTag);
      setInput('');
    }
  };

  const suggestions = allTags.filter(
    (t) => t.name.includes(input) && !pageTags.find((pt) => pt.id === t.id)
  );

  return (
    <div style={styles.container}>
      <div style={styles.chips}>
        {pageTags.map((tag) => (
          <span key={tag.id} style={styles.chip}>
            {tag.name}
            <button style={styles.chipRemove} onClick={() => handleRemove(tag.id)}>×</button>
          </span>
        ))}
        <input
          style={styles.input}
          placeholder="태그 추가..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCreate}
        />
      </div>
      {input && suggestions.length > 0 && (
        <div style={styles.dropdown}>
          {suggestions.map((tag) => (
            <div key={tag.id} style={styles.dropdownItem} onClick={() => { handleAdd(tag); setInput(''); }}>
              {tag.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { position: 'relative', marginBottom: '16px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  chip: { background: '#e8e5de', padding: '2px 8px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' },
  chipRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, lineHeight: 1 },
  input: { border: 'none', outline: 'none', fontSize: '13px', minWidth: '80px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #ddd', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 100 },
  dropdownItem: { padding: '8px 12px', cursor: 'pointer', fontSize: '13px' },
};
