{{{ if loggedIn }}}
<button component="topic/resolve" class="btn btn-ghost btn-sm ff-secondary d-flex gap-2 align-items-center {{{ if resolved }}}hidden{{{ end }}}">
	<i class="fa fa-fw fa-check-circle text-primary"></i>
	<span class="d-none d-md-inline fw-semibold text-truncate text-nowrap">[[topic:mark-resolved]]</span>
</button>

<button component="topic/unresolve" class="btn btn-ghost btn-sm ff-secondary d-flex gap-2 align-items-center {{{ if !resolved }}}hidden{{{ end }}}">
	<i class="fa fa-fw fa-undo text-primary"></i>
	<span class="d-none d-md-inline fw-semibold text-truncate text-nowrap">[[topic:mark-unresolved]]</span>
</button>
{{{ end }}}