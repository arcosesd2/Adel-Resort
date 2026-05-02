export default function Eyebrow({ children, as: Tag = 'p', className = '', muted = false }) {
  const tone = muted ? 'eyebrow-muted' : 'eyebrow'
  return <Tag className={`${tone} ${className}`}>{children}</Tag>
}
