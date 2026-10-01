from xml.etree.ElementTree import Element, SubElement, tostring
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.http import require_safe


@require_safe
def robots(request):
    body = ('User-agent: *\nDisallow: /api/\nDisallow: /auth/\n'
            'Disallow: /telegram/\n'
            f'Sitemap: {settings.APP_ORIGIN}/sitemap.xml\n')
    response = HttpResponse(body, content_type='text/plain; charset=utf-8')
    response['Cache-Control'] = 'public, max-age=300'
    return response


@require_safe
def sitemap(request):
    # Public cards are shareable, but this endpoint must not enumerate users.
    root = Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    SubElement(SubElement(root, 'url'), 'loc').text = settings.APP_ORIGIN + '/'
    response = HttpResponse(tostring(root, encoding='utf-8', xml_declaration=True), content_type='application/xml')
    response['Cache-Control'] = 'public, max-age=300'
    return response
