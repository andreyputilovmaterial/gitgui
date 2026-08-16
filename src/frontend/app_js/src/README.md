
## On css styling:
Please be "mobile-first" whether possible. This app is designed as desktop app -
it is launched from localhost, so unlikely opened in a phone. However, as all
in our world, it should be mobile-first. Because that's the correct way to
approach design. So, first mental order is that all is stacked in some vertical
queue, suitable for mobile. And then we add (min-width) css rules, to achieve
the desired look in full desktop layout. But not (max-width). We don't adjust
for smaller devices. We design for smaller devices, and then only adjust
for bigger.

On css classes: I have my personal preferences, but this is not clearly
expressed now, at the moment. The problem, with backend bundler, I don't
have any "scoped" styles. So I have to rely on class names itself. And the goal
is at the same time keep all standardized, and avoid overcomplicating. So,
some simple classes are valid, like .hash, .message, .button, but with css
rules they should only be addressed within component's parent class. Never
style .button, or .hash, or .message. globally. And that parent component
class should follow some global guidelines for naming (I don't have it
formulated yet but this is necessary)

All "component" classes should be prefixed - like, not .form-controls, but
.mdm-form-controls, or .git-ui-form-controls, or .git-gui-app-form-controls
(depending on where does this component stand in hierarchy - does it belong
to app or global frontend template, or just a secondary helper component)
