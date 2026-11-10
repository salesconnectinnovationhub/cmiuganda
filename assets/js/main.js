(function ($) {
	"use strict";

/*=============================================
	=    		 Preloader			      =
=============================================*/
function preloader() {
	$('#preloader').delay(0).fadeOut();
};

$(window).on('load', function () {
	preloader();
	mainSlider();
	wowAnimation();
	tg_title_animation();
});



/*=============================================
	=    		Mobile Menu			      =
=============================================*/
//SubMenu Dropdown Toggle
if ($('.menu-area li.menu-item-has-children ul').length) {
	$('.menu-area .navigation li.menu-item-has-children').append('<div class="dropdown-btn"><span class="fas fa-angle-down"></span></div>');

}

//Mobile Nav Hide Show
if ($('.mobile-menu').length) {

	var mobileMenuContent = $('.menu-area .main-menu').html();
	$('.mobile-menu .menu-box .menu-outer').append(mobileMenuContent);
	const mobileMenu = document.querySelector('.mobile-menu');
	const mobileMenuToggler = document.querySelector('.mobile-nav-toggler');
	const mobileMenuClose = mobileMenu.querySelector('.close-btn');
	const mobileMenuFocusables = () => [...mobileMenu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
		.filter((element) => element.getClientRects().length > 0);
	const setMobileMenuOpen = (isOpen, restoreFocus = true) => {
		$('body').toggleClass('mobile-menu-visible', isOpen);
		mobileMenuToggler.setAttribute('aria-expanded', String(isOpen));
		if (isOpen) mobileMenuClose.focus();
		else if (restoreFocus) mobileMenuToggler.focus();
	};

	//Dropdown Button
	$('.mobile-menu li.menu-item-has-children .dropdown-btn').on('click', function () {
		$(this).toggleClass('open');
		$(this).prev('ul').slideToggle(300);
	});
	//Menu Toggle Btn
	mobileMenuToggler.addEventListener('click', () => setMobileMenuOpen(true));

	//Menu Toggle Btn
	document.querySelector('.menu-backdrop').addEventListener('click', () => setMobileMenuOpen(false));
	mobileMenuClose.addEventListener('click', () => setMobileMenuOpen(false));
	document.addEventListener('keydown', (event) => {
		if (!$('body').hasClass('mobile-menu-visible')) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			setMobileMenuOpen(false);
			return;
		}
		if (event.key !== 'Tab') return;
		const focusables = mobileMenuFocusables();
		if (!focusables.length) {
			event.preventDefault();
			mobileMenuClose.focus();
			return;
		}
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		if (event.shiftKey && (document.activeElement === first || !mobileMenu.contains(document.activeElement))) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && (document.activeElement === last || !mobileMenu.contains(document.activeElement))) {
			event.preventDefault();
			first.focus();
		}
	});
}



/*=============================================
	=     Menu sticky & Scroll to top      =
=============================================*/
$(window).on('scroll', function () {
	var scroll = $(window).scrollTop();
	if (scroll < 245) {
		$("#sticky-header").removeClass("sticky-menu");
        $('.scroll-to-target').removeClass('open');
		$("#header-fixed-height").removeClass("active-height");

	} else {
		$("#sticky-header").addClass("sticky-menu");
        $('.scroll-to-target').addClass('open');
		$("#header-fixed-height").addClass("active-height");
	}
});


/*=============================================
	=    		 Scroll Up  	         =
=============================================*/
if ($('.scroll-to-target').length) {
  $(".scroll-to-target").on('click', function () {
    var target = $(this).attr('data-target');
    // animate
    $('html, body').animate({
      scrollTop: $(target).offset().top
    }, 100);

  });
}

/*=============================================
	=           Data Background             =
=============================================*/
$("[data-background]").each(function () {
	$(this).css("background-image", "url(" + $(this).attr("data-background") + ")")
})


/*=============================================
	=        Team Social Active 	       =
=============================================*/
$('.tooltip-btn').on('click', function () {
	$(this).parent().toggleClass('active');
	return true;
});

/*=============================================
	=    		 Main Slider		      =
=============================================*/
function mainSlider() {
	var BasicSlider = $('.slider-active');
	BasicSlider.on('init', function (e, slick) {
		var $firstAnimatingElements = $('.single-slider:first-child').find('[data-animation]');
		doAnimations($firstAnimatingElements);
	});
	BasicSlider.on('beforeChange', function (e, slick, currentSlide, nextSlide) {
		var $animatingElements = $('.single-slider[data-slick-index="' + nextSlide + '"]').find('[data-animation]');
		doAnimations($animatingElements);
	});
	BasicSlider.slick({
		autoplay: false,
		autoplaySpeed: 10000,
		dots: false,
		fade: true,
		arrows: false,
		responsive: [
			{ breakpoint: 767, settings: { dots: false, arrows: false } }
		]
	});

	function doAnimations(elements) {
		var animationEndEvents = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
		elements.each(function () {
			var $this = $(this);
			var $animationDelay = $this.data('delay');
			var $animationType = 'animated ' + $this.data('animation');
			$this.css({
				'animation-delay': $animationDelay,
				'-webkit-animation-delay': $animationDelay
			});
			$this.addClass($animationType).one(animationEndEvents, function () {
				$this.removeClass($animationType);
			});
		});
	}
}


/*=============================================
	=    		Brand Active		      =
=============================================*/
$('.brand-active').slick({
	dots: false,
	infinite: true,
	speed: 1000,
	autoplay: true,
	arrows: false,
	slidesToShow: 6,
	slidesToScroll: 2,
	responsive: [
		{
			breakpoint: 1400,
			settings: {
				slidesToShow: 5,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 4,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
	]
});


/*=============================================
	=    		Brand Active		      =
=============================================*/
$('.brand-active-two').slick({
	dots: false,
	infinite: true,
	speed: 1000,
	autoplay: true,
	arrows: false,
	slidesToShow: 4,
	slidesToScroll: 1,
	responsive: [
		{
			breakpoint: 1400,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
				arrows: false,
			}
		},
	]
});



/*=============================================
	=    		Brand Active		      =
=============================================*/
$('.brand-active-three').slick({
	dots: false,
	infinite: true,
	speed: 1000,
	autoplay: true,
	arrows: false,
	slidesToShow: 5,
	slidesToScroll: 1,
	responsive: [
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 4,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
	]
});


/*=============================================
	=    		testimonial Active		      =
=============================================*/
$('.testimonial-active').slick({
	dots: true,
	infinite: true,
	speed: 1000,
	autoplay: false,
	arrows: false,
	slidesToShow: 1,
	slidesToScroll: 1,
	responsive: [
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
	]
});


/*=============================================
	=    		testimonial Active		      =
=============================================*/
$('.testimonial-active-two').slick({
	dots: true,
	infinite: true,
	speed: 1000,
	autoplay: false,
	arrows: false,
	fade: true,
	slidesToShow: 1,
	slidesToScroll: 1,
	responsive: [
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
	]
});



/*=============================================
	=         banner Active           =
=============================================*/
$('.sliderContent-active').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: true,
	asNavFor: '.sliderNav-active',
}).slickAnimation();

$('.sliderNav-active').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
	asNavFor: '.sliderContent-active',
    dots: false,
	fade: true,
	arrows: true,
	prevArrow: '<button type="button" class="slick-prev"><img src="assets/img/icon/left_arrow.svg" alt=""></button>',
	nextArrow: '<button type="button" class="slick-next"><img src="assets/img/icon/right_arrow.svg" alt=""></button>',
	appendArrows: ".banner-nav",
    speed: 1000,
    responsive: [
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
	]
});

/*=============================================
	=         project-active           =
=============================================*/
$('.project-active').slick({
	centerMode: true,
	autoplay: false,
	infinite: true,
	dots: true,
	speed: 1500,
	arrows: false,
	centerPadding: '0',
	slidesToShow: 2,
	responsive: [
		{
			breakpoint: 1800,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 1500,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
				centerPadding: '0',
				infinite: true,
			}
		},
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
				centerPadding: '0',
				infinite: true,
				arrows: false,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 1,
				centerPadding: '0',
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				centerPadding: '0px',
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				centerPadding: '0px',
				arrows: false,
			}
		},
	]
});


$('.home-project-slider').slick({
	infinite: true,
	autoplay: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
	autoplaySpeed: 5500,
	speed: 650,
	pauseOnHover: true,
	pauseOnFocus: true,
	dots: true,
	arrows: true,
	prevArrow: '<button type="button" class="home-project-arrow home-project-prev" aria-label="Previous project"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>',
	nextArrow: '<button type="button" class="home-project-arrow home-project-next" aria-label="Next project"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>',
	slidesToShow: 1,
	slidesToScroll: 1,
});

/*=============================================
	=    		Project Active		      =
=============================================*/
$('.project-active-two').slick({
	dots: true,
	infinite: true,
	speed: 1000,
	autoplay: false,
	arrows: false,
	slidesToShow: 3,
	slidesToScroll: 1,
	responsive: [
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				arrows: false,
			}
		},
	]
});


/*=============================================
	=         gallery-active           =
=============================================*/
$('.engineer-active').slick({
	centerMode: true,
	autoplay: true,
	infinite: true,
	speed: 500,
	dots: true,
	centerPadding: '0',
	arrows: false,
	slidesToShow: 3,
	responsive: [
		{
			breakpoint: 1800,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1,
				infinite: true,
			}
		},
		{
			breakpoint: 1500,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1,
				centerPadding: '0',
				infinite: true,
			}
		},
		{
			breakpoint: 1200,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 1,
				centerPadding: '0',
				infinite: true,
			}
		},
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 1,
				centerPadding: '0',
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 767,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				centerPadding: '0px',
				arrows: false,
			}
		},
		{
			breakpoint: 575,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				centerPadding: '0px',
				arrows: false,
			}
		},
	]
});



/*=============================================
	=          services Active               =
=============================================*/
$('.services-item').hover(function () {
	$(this).find('.services-overlay-content').slideToggle(300);
	return false;
});
$('.services-item').hover(function () {
	$(this).find('.services-content .title').slideToggle(300);
	return true;
});
$('.services-item').hover(function () {
	$(this).find('.services-icon').slideToggle(300);
	return true;
});



/*=============================================
	=          project Active               =
=============================================*/
$('.project-item').hover(function () {
	$(this).find('.project-content p').slideToggle(300);
	return false;
});
$('.project-item').hover(function () {
	$(this).find('.project-content .title').slideToggle(300);
	return true;
});
$('.project-item').hover(function () {
	$(this).find('.project-thumb').slideToggle(400);
	return false;
});



/*=============================================
	=        parallaxMouse Active          =
=============================================*/
function parallaxMouse() {
	if ($('.parallax').length) {
		var scene = document.querySelectorAll('.parallax');
		for (var i = 0; i < scene.length; i++) {
			var parallaxInstance = new Parallax(scene[i], {
				relativeInput: true,
				hoverOnly: true,
				selector: '.layer',
				pointerEvents: true,
			});
		}
	};
};
parallaxMouse();

/*=============================================
	=    		 Jarallax Active  	         =
=============================================*/
$('.jarallax').jarallax({
	speed: 0.2,
});


/*=============================================
	=    		Odometer Active  	       =
=============================================*/
$('.odometer').appear(function (e) {
	var odo = $(".odometer");
	odo.each(function () {
		var countNumber = $(this).attr("data-count");
		$(this).html(countNumber);
	});
});


/*=============================================
	=    		Magnific Popup		      =
=============================================*/
$('.popup-image').magnificPopup({
	type: 'image',
	gallery: {
		enabled: true
	}
});

/* magnificPopup video view */
$('.popup-video').magnificPopup({
	type: 'iframe'
});



/*=============================================
	=    		 Wow Active  	         =
=============================================*/
function wowAnimation() {
	var wow = new WOW({
		boxClass: 'wow',
		animateClass: 'animated',
		offset: 0,
		mobile: false,
		live: true
	});
	wow.init();
}


const conversionEventNames = new Set([
	'consultation_click', 'contact_submit', 'interest_submit', 'estimator_handoff',
	'phone_click', 'whatsapp_click', 'chat_click', 'payment_start', 'payment_return',
]);

window.cmiTrackConversion = function (eventName) {
	if (!conversionEventNames.has(eventName)
		|| navigator.doNotTrack === '1'
		|| window.doNotTrack === '1'
		|| navigator.globalPrivacyControl === true) return;

	const body = JSON.stringify({ event: eventName, path: window.location.pathname || '/' });
	fetch('/api/analytics', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'content-type': 'application/json' },
		body,
		keepalive: true,
	}).catch(() => {});
};

document.addEventListener('click', (event) => {
	if (!(event.target instanceof Element)) return;
	const link = event.target.closest('a[href]');
	if (!link) return;
	const href = link.getAttribute('href') || '';
	let eventName = link.dataset.analyticsEvent;
	if (!eventName && href.startsWith('tel:')) eventName = 'phone_click';
	if (!eventName && /(?:wa\.me|api\.whatsapp\.com)/i.test(href)) eventName = 'whatsapp_click';
	if (!eventName && /(?:^|\/)chat\.html(?:[?#]|$)/i.test(href)) eventName = 'chat_click';
	if (!eventName && link.textContent.trim().toLowerCase().includes('request a consultation')) eventName = 'consultation_click';
	if (eventName) window.cmiTrackConversion(eventName);
});

if (window.location.pathname === '/success.html') {
	window.cmiTrackConversion('payment_return');
}

})(jQuery);
