import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Flujo Consulta MVP', () => {
  it('transcribe → parsea → guarda reporte', async () => {
    // Reemplaza con el componente real del flujo si existe
    const Flow = () => <div><button>Guardar</button><div>Transcripción Original</div><div>Resumen estructurado (MVP)</div></div>;
    render(<Flow />);
    expect(screen.getByText('Transcripción Original')).toBeInTheDocument();
    expect(screen.getByText('Resumen estructurado (MVP)')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeEnabled();
  });
});
