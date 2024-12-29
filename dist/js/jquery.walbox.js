/*
 * Walbox 1.0 - Box Always.
 * By Shivasis Biswal (http://www.hostspacer.com)
 * Copyright (c) 2014 Krushna Biswal
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Usage: $('.walbox').Walbox(); // <a href="xyz.html" title="xyz" class="walbox"></a>
 * With Width and Height: $('.walbox').Walbox({width:800,height:600});
 * with Title and Content: $('.walbox').Walbox({title: 'My Walbox Title', contents:'My Walbox Content'});
 * Requirement: JQuery Latest Version, 
 * CSS File with class name .walbox_overlay, .walbox_modal, .walbox_title, .walbox_content, .walbox_close
 * Included as Example.
 */

(function($, window, document, undefined) {

    "use strict";
    
    // Polyfill for Object.create for older browsers
    if (typeof Object.create !== 'function') {
        Object.create = function(obj) {
            function B() {}
            B.prototype = obj;
            return new B();
        };
    }
	
	// Helper function to debounce events (e.g., resize and scroll)
	function debounce(func, delay) {
	  let timeout;
	  return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), delay);
	  };
	}

    // Default options
    const defaults = {
        title: null,
        content: null,
        size: 'medium',
        width: null,
        height: null,
        top: null,
        left: null,
        close: true,
        overlay: false,
        escape: true,
        showOverlay: true,
        showClose: true,
        showTitle: true,
        iframe: false,
		adjust: true,
        drag: true,
        action: null
    };

    let modalCount = 0;

    // Walbox object that holds all methods for modals
    const Walbox = {

        // Add the modal to the DOM
        addWalbox: function(options, elem) {
            modalCount++;
            let linkTitle = $(elem).attr('walbox-title') || $(elem).attr('title') || $(elem).prop("alt") || $(elem).text(),
                linkUrl = $(elem).attr('walbox-content') || $(elem).prop("href") || $(elem).prop("src"),
                walboxTitle = options.title || linkTitle,
                walboxContent = options.content || this.getUrlContent(linkUrl);

            // Create the modal HTML structure
            let modalHtml = `<div id="walbox-${modalCount}" class="walbox-modal ${options.size}">
                                ${options.showClose ? '<a href="javascript:void(0);" class="walbox-close" title="Close">&times;</a>' : ''}
                                ${options.showTitle ? `<div class="walbox-title">${walboxTitle}</div>` : ''}
                                ${options.iframe || this.isValidUrl(walboxContent) ? 
                                    `<iframe class="walbox-iframe" src="${walboxContent}"></iframe>` : 
                                    `<div class="walbox-content">${walboxContent}</div>`}
                             </div>`;

            // Remove existing modals
            $('.walbox_modal').fadeOut(400).remove();

            // Append the new modal
            $('body').append(modalHtml);
        },

        // Get content for URLs, either HTML content or the link itself
        getUrlContent: function(url) {
            let anchor = url.includes("#") ? url.split('#')[1] : '';
            return anchor ? $(`#${anchor}`).html() : url;
        },

        // Add overlay (background)
        addOverlay: function(options) {
            const showOverlay = options.showOverlay !== undefined ? options.showOverlay : defaults.showOverlay;
            if (showOverlay) {
                // Only create overlay if it doesn't exist
                if ($('.walbox-overlay').length === 0) {
                    $('<div class="walbox-overlay"></div>').appendTo('body').fadeIn(500);
                }

                // Handle overlay click
                $('.walbox-overlay').click(function() {
                    if (options.overlay !== false) {
                        $('.walbox-modal').fadeOut(400).remove();
                        $(this).fadeOut(400).remove();
                    }
                });
            }
        },

        // Center the modal in the viewport
        centerPosition: function(options) {
            const $modal = $('.walbox-modal');
            const winWidth = $(window).width(),
                winHeight = $(window).height(),
                modalWidth = options.width || $modal.outerWidth(),
                modalHeight = options.height || $modal.outerHeight(),
                top = options.top || Math.max((winHeight - modalHeight) / 2, 0),
                left = options.left || Math.max((winWidth - modalWidth) / 2, 0);

            // Ensure modal doesn't overflow off-screen
            $modal.css({
                'top': Math.round(top),
                'left': Math.round(left),
                'width': options.width || 'auto',
                'height': options.height || 'auto'
            }).fadeIn(500);
        },
		
		// Function to handle window resize and scroll events (to re-adjust modal position if necessary)
		adjustPosition: function (options) {
			
		 if (options.adjust === false) return; // Do nothing if adjust is disabled
			
		  $(window).on('scroll resize', debounce(function () {
			var winWidth = $(window).width(),
				winHeight = $(window).height(),
				winTop = $(window).scrollTop(),
				winLeft = $(window).scrollLeft();

			$('.walbox-modal').each(function () {
			  var box = $(this),
				  boxWidth = box.outerWidth(),
				  boxHeight = box.outerHeight(),
				  offset = box.offset();

			  // Recalculate modal position if necessary
			  let top = Math.min(Math.max(offset.top, winTop), winTop + (winHeight - boxHeight));
			  let left = Math.min(Math.max(offset.left, winLeft), winLeft + (winWidth - boxWidth));

			  // Update the modal position if it's outside the viewport
			  box.offset({ top: top, left: left });
			});
		  }, 200)); // 200ms debounce delay for performance
		},
		
        // Make the modal draggable
        draggable: function(options) {
            if (options.drag === false) return; // Do nothing if drag is disabled

			let move = {
				isDown: false,
				left: 0,
				top: 0
			};
			
            $(document).on('mousedown', '.walbox-title', function(ev) {
          
                move.isDown = true;
                
			let	handle = $(this),
				box = handle.closest('.walbox-modal'),
        		offset = box.offset(),
				boxWidth = box.outerWidth(),
				boxHeight = box.outerHeight(),
				winWidth = $(window).width(),
				winHeight = $(window).height(),
				winTop = $(window).scrollTop(),
				winLeft = $(window).scrollLeft();

                ev.preventDefault();
                ev.stopPropagation();
				
				// Save the mouse position relative to the modal's top-left corner
				move.left = ev.pageX - offset.left;
				move.top = ev.pageY - offset.top;

				// Disable text selection and change cursor style
				handle.css({'user-select': 'none', 'cursor': 'move'});

                $(document).on('mousemove', function(ev) {
					
                 if (!move.isDown) return;
					
				 if(boxHeight > winHeight) return;
					
				// Calculate the new top/left positions to keep the modal within the viewport
				  let top, left;
				  if (winTop > 0 || winLeft > 0) {
					top = Math.min(Math.max(ev.pageY - move.top, 0), winTop + (winHeight - boxHeight));
					left = Math.min(Math.max(ev.pageX - move.left, 0), winLeft + (winWidth - boxWidth));
				  } else {
					top = Math.min(Math.max(ev.pageY - move.top, 0), winHeight - boxHeight);
					left = Math.min(Math.max(ev.pageX - move.left, 0), winWidth - boxWidth);
				  }
				
                    box.offset({ top: top, left: left });
					
                }).on('mouseup', function() {
                    move.isDown = false;
                    $(document).off('mousemove');
					handle.css({'user-select': '', 'cursor': 'default'});
                });
            });
        },

        // Close the modal when the close button or overlay is clicked
        closeWalbox: function(options) {
            if (options.close !== false) {
                $(document).on('click', '.walbox-close', function() {
                    $('.walbox-modal').fadeOut(400).remove();
                    $('.walbox-overlay').fadeOut(400).remove();
                });
            }

            if (options.overlay !== false) {
                $(document).on('click', '.walbox-overlay', function() {
                    $('.walbox-modal').fadeOut(400).remove();
                    $(this).fadeOut(400).remove();
                });
            }
        },

        // Close modal when Escape key is pressed
        closeEsc: function(options) {
            if (options.escape !== false) {
                $(document).keyup(function(ev) {
                    if ($('.walbox-overlay').is(':visible') && ev.which === 27) { // ESC key
                        $('.walbox-modal').fadeOut(400).remove();
                        $('.walbox-overlay').fadeOut(400).remove();
                    }
                });
            }
        },

        // Run a callback action after modal is shown
        onAction: function(options) {
            if (options.action && typeof options.action === "function") {
                setTimeout(options.action, 1000); // Delay action to ensure modal is loaded
            }
        },

        // Validate URL (checks if the string is a valid URL)
        isValidUrl: function(url) {
            const regex = /^(https?|s?ftp):\/\/[^\s/$.?#].[^\s]*$/i;
            return regex.test(url);
        },

        // Initialize modal with options
        init: function(options, elem) {
            this.addOverlay(options);
            this.addWalbox(options, elem);
            this.centerPosition(options);
			this.adjustPosition(options);
            this.closeWalbox(options);
            this.closeEsc(options);
            this.onAction(options);
            this.draggable(options);
			
			// Recalculate position on window resize
            $(window).on('resize', () => {
                this.centerPosition(options);
            });
        }
    };

    // jQuery plugin for initializing modal on click event
    $.fn.walbox = function(opts) {
        const options = $.extend({}, defaults, opts);
        return this.click(function(e) {
            e.preventDefault();
            Walbox.init(options, this);
        });
    };

    // Direct call method for initializing modal
    $.walbox = function(options) {
        const walbox = Object.create(Walbox);
        walbox.init(options);
    };

})(jQuery, window, document);
