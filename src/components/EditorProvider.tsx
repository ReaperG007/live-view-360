import { useReducer, useRef, type ReactNode } from 'react';
import { EditorContext, editorReducer, initialState } from '../store/editor-store';
import type { ModelViewerInstance } from '../model-viewer';

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const modelViewerRef = useRef<ModelViewerInstance | null>(null);

  return (
    <EditorContext.Provider value={{ state, dispatch, modelViewerRef }}>
      {children}
    </EditorContext.Provider>
  );
}
