// This is separated to ensure that jQuery is loaded before bootbox
import jquery from 'jquery'

declare global {
	interface Window {
		$: JQueryStatic
		jQuery:	JQueryStatic
	}
}
window.$ = window.jQuery = jquery
