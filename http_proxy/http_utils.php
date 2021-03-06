<?php
namespace aufschlagwechsel\bup\http_utils;

define('BUP_USER_AGENT', 'bup (phihag@phihag.de)');

class CookieJar {
	private $jar;

	public function __construct() {
		$this->jar = [];
	}

	public function read_from_stream($f) {
		$meta = \stream_get_meta_data($f);
		$headers = $meta['wrapper_data'];
		foreach ($headers as $h) {
			$this->read_from_header($h);
		}
	}

	public function read_from_header($header) {
		if (\preg_match('/^Set-Cookie:\s*([A-Za-z_0-9.-]+)=(.*?)(?:$|;)/', $header, $m)) {
			$this->jar[$m[1]] = $m[2];
		}
	}

	public function make_header() {
		return 'Cookie: ' . $this->get_line() . "\r\n";
	}

	public function get_line() {
		$res = '';
		foreach ($this->jar as $k => $v) {
			$res .= $k . '=' . $v . ';';
		}
		return $res;
	}

	public function get($name) {
		return $this->jar[$name];
	}

	public function set($name, $val) {
		$this->jar[$name] = $val;
	}

	public function get_all() {
		return $this->jar;
	}

	public function set_all($cookies) {
		foreach ($cookies as $k => $v) {
			$this->set($k, $v);
		}
	}
}

abstract class AbstractHTTPClient {
	public function __construct() {

	}

	public static function make() {
		if (CurlHTTPClient::is_supported()) {
			return new CurlHTTPClient();
		}
		return new PhpHTTPClient();
	}

	abstract public function get_cookie($name);
	abstract public function set_cookie($name, $val);
	abstract public function get_all_cookies();

	/**
	* Returns the response body, or false if the request failed.
	*/
	abstract public function request($url, $headers=null, $method='GET', $body=null);

	abstract public function get_error_info();
}

abstract class JarHTTPClient extends AbstractHTTPClient {
	protected $cjar;

	public function __construct() {
		parent::__construct();
		$this->cjar = new CookieJar();
	}

	public function get_cookie($name) {
		return $this->cjar->get($name);
	}

	public function set_cookie($name, $val) {
		$this->cjar->set($name, $val);
	}

	public function get_all_cookies() {
		return $this->cjar->get_all();
	}

	public function set_all_cookies($cookies) {
		$this->cjar->set_all($cookies);
	}
}

class PhpHTTPClient extends JarHTTPClient {
	public function __construct() {
		parent::__construct();
	}

	public function request($url, $headers=null, $method='GET', $body=null) {
		$header = (
			($headers ? \implode("\r\n", $headers) . "\r\n" : '') .
			$this->cjar->make_header()
		);
		$options = [
			'http' => [
				'header' => $header,
				'method' => $method,
				'follow_location' => 0,
				'user_agent' => BUP_USER_AGENT,
			],
			];
		if ($body) {
			$options['http']['content'] = $body;
		}

		$context = \stream_context_create($options);
		$f = \fopen($url, 'r', false, $context);
		if ($f === false) {
			return false;
		}
		$this->cjar->read_from_stream($f);
		$page = \stream_get_contents($f);
		\fclose($f);
		return $page;
	}

	public function get_error_info() {
		return \json_encode($http_response_header);
	}
}

class CurlHTTPClient extends JarHTTPClient {
	private $ch;

	public function __construct() {
		parent::__construct();
		$this->ch = \curl_init();
		\curl_setopt($this->ch, \CURLOPT_RETURNTRANSFER, true);
		\curl_setopt($this->ch, \CURLOPT_FAILONERROR, true);
	}

	public function request($url, $headers=null, $method='GET', $body=null) {
		$cjar = $this->cjar;
		\curl_setopt($this->ch, \CURLOPT_HEADERFUNCTION, function($ch, $header_line) use ($cjar) {
			$cjar->read_from_header($header_line);
			return \strlen($header_line);
		});
		\curl_setopt($this->ch, \CURLOPT_COOKIE, $cjar->get_line());
		\curl_setopt($this->ch, \CURLOPT_USERAGENT, BUP_USER_AGENT);
		\curl_setopt($this->ch, \CURLOPT_URL, $url);
		\curl_setopt($this->ch, \CURLOPT_CUSTOMREQUEST, $method);
		if ($headers) {
			\curl_setopt($this->ch, \CURLOPT_HTTPHEADER, $headers);
		}
		if ($body) {
			\curl_setopt($this->ch, \CURLOPT_POSTFIELDS, $body);
		}
		return \curl_exec($this->ch);
	}

	public function get_error_info() {
		return \curl_error($this->ch);
	}

	public static function is_supported() {
		return \function_exists('curl_version');
	}
}


class CacheHTTPClient extends AbstractHTTPClient {
	private $cache_dir;
	private $real_httpc;

	public function __construct($real_httpc, $cache_dir) {
		parent::__construct();
		$this->real_httpc = $real_httpc;
		$this->cache_dir = $cache_dir;
		if (!\is_dir($cache_dir)) {
			\mkdir($cache_dir);
		}
	}

	public function request($url, $headers=null, $method='GET', $body=null) {
		if ($method !== 'GET') {
			throw new \Exception('CacheHTTPClient only suppors GET!');
		}

		$cache_fn = $this->cache_dir . '/' . \preg_replace('/[^a-z0-9\.]+/', '_', $url) . '.html';
		if (\file_exists($cache_fn)) {
			return \file_get_contents($cache_fn);
		}

		$res = $this->real_httpc->request($url, $headers, $method, $body);
		\file_put_contents($cache_fn, $res);
		return $res;
	}

	public function get_cookie($name) {
		return $this->real_httpc->get_cookie($name);
	}

	public function set_cookie($name, $val) {
		return $this->real_httpc->set_cookie($name, $val);
	}

	public function get_all_cookies() {
		return $this->real_httpc->get_all_cookies();
	}

	public function get_error_info() {
		return $this->real_httpc->get_error_info();
	}
}
