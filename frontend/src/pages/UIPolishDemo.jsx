import { useState } from 'react';
import { Button, FormField, Badge, StatusBadge, Alert, Breadcrumb, EmptyState } from '../components/UIKit';
import { FormLayout, FormSection, FormRow, FormActions, PageHeader, CardContainer } from '../components/FormLayout';
import { SkeletonCard, SkeletonTable, SkeletonFormField, SkeletonMultiRow } from '../components/Skeleton';

export default function UIPolishDemo() {
  const [activeTab, setActiveTab] = useState('buttons');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [showLoading, setShowLoading] = useState(false);

  const tabs = [
    { id: 'buttons', label: 'Buttons', icon: 'smart_button' },
    { id: 'forms', label: 'Forms', icon: 'description' },
    { id: 'badges', label: 'Badges', icon: 'label' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications' },
    { id: 'skeleton', label: 'Skeletons', icon: 'skeleton' },
    { id: 'layout', label: 'Layout', icon: 'dashboard' },
  ];

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.phone) newErrors.phone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      alert('Form submitted successfully!');
      setLoading(false);
      setFormData({ name: '', email: '', phone: '' });
      setErrors({});
    }, 1500);
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Components', href: null }
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="UI Component Showcase"
        subtitle="Explore all available UI components and design system elements"
        breadcrumb={<Breadcrumb items={breadcrumbItems} />}
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
              }
            `}
          >
            <span className="material-symbols-outlined align-middle mr-1 text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* BUTTONS TAB */}
      {activeTab === 'buttons' && (
        <div className="space-y-6">
          <CardContainer title="Button Variants">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Primary Buttons</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="primary" loading>Loading</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Secondary Buttons</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="secondary" loading>Loading</Button>
                  <Button variant="secondary" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Outline Buttons</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline">Outline</Button>
                  <Button variant="outline" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Ghost Buttons</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="ghost" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Danger Buttons</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="danger">Delete</Button>
                  <Button variant="danger" size="sm">Small Delete</Button>
                </div>
              </div>
            </div>
          </CardContainer>

          <CardContainer title="Button with Icons">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">
                <span className="material-symbols-outlined text-lg">save</span>
                Save
              </Button>
              <Button variant="secondary">
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit
              </Button>
              <Button variant="outline">
                <span className="material-symbols-outlined text-lg">download</span>
                Download
              </Button>
              <Button variant="danger">
                <span className="material-symbols-outlined text-lg">delete</span>
                Delete
              </Button>
            </div>
          </CardContainer>
        </div>
      )}

      {/* FORMS TAB */}
      {activeTab === 'forms' && (
        <CardContainer title="Form Components">
          <FormLayout onSubmit={handleFormSubmit} submitting={loading}>
            {Object.keys(errors).length > 0 && (
              <Alert type="error" onClose={() => setErrors({})}>
                Please fix the errors below and try again.
              </Alert>
            )}

            <FormSection title="Contact Information" description="Enter your details below">
              <FormRow cols={1}>
                <FormField label="Full Name" required error={errors.name} hint="Enter your full name">
                  <input
                    className="form-input"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                  />
                </FormField>
              </FormRow>

              <FormRow cols={2}>
                <FormField label="Email" required error={errors.email} hint="Your email address">
                  <input
                    className="form-input"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="john@example.com"
                  />
                </FormField>

                <FormField label="Phone" required error={errors.phone} hint="10-digit phone number">
                  <input
                    className="form-input"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="9876543210"
                  />
                </FormField>
              </FormRow>
            </FormSection>

            <FormActions
              onSubmit={handleFormSubmit}
              submitting={loading}
              submitLabel="Submit"
            />
          </FormLayout>
        </CardContainer>
      )}

      {/* BADGES TAB */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <CardContainer title="Badge Variants">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Color Variants</h4>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success">Success</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="neutral">Neutral</Badge>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Status Badges</h4>
                <div className="flex flex-wrap gap-3">
                  <StatusBadge status="active" label="Active" />
                  <StatusBadge status="pending" label="Pending" />
                  <StatusBadge status="completed" label="Completed" />
                  <StatusBadge status="error" label="Error" />
                </div>
              </div>
            </div>
          </CardContainer>

          <CardContainer title="Usage Examples">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span>Job Card Status</span>
                <StatusBadge status="active" label="In Progress" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span>Quality Check</span>
                <StatusBadge status="completed" label="Passed" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span>Dispatch</span>
                <StatusBadge status="pending" label="Awaiting" />
              </div>
            </div>
          </CardContainer>
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {showAlert && (
            <Alert type="success" onClose={() => setShowAlert(false)}>
              This is a success alert. You can dismiss it by clicking the X button.
            </Alert>
          )}

          <Alert type="error">
            This is an error alert. Something went wrong and needs your attention.
          </Alert>

          <Alert type="warning">
            This is a warning alert. Please review this important information before proceeding.
          </Alert>

          <Alert type="info">
            This is an info alert. Some helpful information about the current operation.
          </Alert>

          <CardContainer title="Alert Types Reference">
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Success:</strong> Use for successful operations and confirmations</p>
              <p><strong>Error:</strong> Use for failures, validation errors, and critical issues</p>
              <p><strong>Warning:</strong> Use for important notices that need attention</p>
              <p><strong>Info:</strong> Use for general information and helpful tips</p>
            </div>
          </CardContainer>
        </div>
      )}

      {/* SKELETON TAB */}
      {activeTab === 'skeleton' && (
        <div className="space-y-6">
          <CardContainer title="Loading States">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Card Skeleton</h4>
                <SkeletonCard />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Table Skeleton</h4>
                <SkeletonTable rows={4} cols={4} />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Form Field Skeleton</h4>
                <SkeletonFormField />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Multi-Row Form</h4>
                <SkeletonMultiRow rows={3} />
              </div>
            </div>
          </CardContainer>

          {!showLoading && (
            <CardContainer title="Skeleton Usage Tips">
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Use SkeletonCard for individual card loadings</p>
                <p>• Use SkeletonTable for data table loadings</p>
                <p>• Use SkeletonFormField for single input load states</p>
                <p>• Use SkeletonMultiRow for multi-field form sections</p>
                <p>• Skeletons prevent layout shift and improve perceived performance</p>
              </div>
            </CardContainer>
          )}
        </div>
      )}

      {/* LAYOUT TAB */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          <CardContainer title="Responsive Grid Layout">
            <FormRow cols={3}>
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-xs text-sky-700 font-semibold">Column 1</p>
                <p className="text-sm text-sky-600">3-column grid</p>
              </div>
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-xs text-sky-700 font-semibold">Column 2</p>
                <p className="text-sm text-sky-600">on desktop</p>
              </div>
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-xs text-sky-700 font-semibold">Column 3</p>
                <p className="text-sm text-sky-600">responsive</p>
              </div>
            </FormRow>
          </CardContainer>

          <CardContainer title="Page Layout Structure">
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">PageHeader</h4>
                <p>Displays page title, subtitle, breadcrumbs, and action buttons</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">FormLayout</h4>
                <p>Main form wrapper with consistent spacing and submission handling</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">FormSection</h4>
                <p>Groups related form fields with title and description</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">FormRow</h4>
                <p>Responsive grid for multiple fields (1, 2, or 3 columns)</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">CardContainer</h4>
                <p>Card wrapper with optional title, actions, and footer</p>
              </div>
            </div>
          </CardContainer>

          <CardContainer title="Empty State Example">
            <EmptyState
              title="No quotes found"
              description="Create your first quote to get it listed here"
              action={<Button variant="primary">Create Quote</Button>}
            />
          </CardContainer>
        </div>
      )}
    </div>
  );
}
