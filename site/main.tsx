import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../design-system/styles/tokens.css';
import '../design-system/styles/components.css';
import {
  Button,
  DesignTokenPreview,
  Modal,
  ProductCard,
  RoomCard,
  SectionHeader,
  Tabs,
  assessRoomProducts,
  auditContrast,
  checkProductCompleteness,
  designTokens,
  summariseRequirements,
  type Product,
  type Room,
} from '../design-system';
import bathroom from '../design-system/data/sample-bathroom.json';
import products from '../design-system/data/sample-products.json';

// The sample data is typed by the schemas in the library; the site only displays it.
const room = bathroom as unknown as Room;
const sampleProducts = products as unknown as Product[];
const reports = assessRoomProducts(room, sampleProducts);
const showcase = sampleProducts.slice(0, 3);

function Preview() {
  const [open, setOpen] = useState(false);
  return (
    <main style={{ maxWidth: '72rem', margin: '0 auto', padding: 'var(--cd-space-8) var(--cd-space-4)' }}>
      <SectionHeader
        level={1}
        eyebrow="Design system preview"
        title="Clawed Design"
        description="Tokens and components, rendered from the library. Every product and material shown is fictional or unverified sample data — nothing here is a specification, and nothing is for construction."
      />
      <Tabs
        label="Preview sections"
        items={[
          {
            id: 'components',
            label: 'Components',
            content: (
              <div style={{ display: 'grid', gap: 'var(--cd-space-8)' }}>
                <RoomCard room={room} requirementSummary={summariseRequirements(room.requirements)} />
                <div style={{ display: 'grid', gap: 'var(--cd-space-6)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(20rem, 100%), 1fr))' }}>
                  {showcase.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      completeness={checkProductCompleteness(product)}
                      report={reports[product.id]}
                    />
                  ))}
                </div>
                <div>
                  <Button onClick={() => setOpen(true)}>Open a dialog</Button>
                  <Modal
                    open={open}
                    onClose={() => setOpen(false)}
                    title="Send concept for review"
                    description="Dialogs trap focus, close with Escape and return focus to the button that opened them."
                    footer={<Button onClick={() => setOpen(false)}>Close</Button>}
                  />
                </div>
              </div>
            ),
          },
          {
            id: 'tokens',
            label: 'Tokens',
            content: <DesignTokenPreview tokens={designTokens} contrast={auditContrast()} />,
          },
        ]}
      />
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
createRoot(root).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
