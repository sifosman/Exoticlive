Step 1: Post from merchant website
After the user confirms his purchase and has chosen Ozow as his preferred payment method, you will need to post the following variables to https://pay.ozow.com/.

Please note

Fields 18 (SelectedBankId) - 27 (VariableAmountMax) are not commonly used and can be ignored unless you specifically require that functionality.

PaymentRequest
Request for creating a payment request.

siteCode
string
required
A unique code for the site currently in use. A site code is generated when adding a site in the Ozow merchant admin section.

<= 50 characters
countryCode
string
required
The ISO 3166-1 alpha-2 code for the user's country. The country code will determine which banks will be displayed to the customer. Please note only South African (ZA) banks are currently supported by Ozow.

<= 2 characters
Example:
ZA
Match pattern:
^[A-Z]+
currencyCode
string
required
The ISO 4217 three-letter code for the transaction currency. Please note only the South African Rand (ZAR) is currently supported by Ozow, so any currency conversion must take place before posting to the Ozow site.

<= 3 characters
Example:
ZAR
Match pattern:
^[A-Z]+
amount
number<double>
required
The transaction amount. The amount is in the currency specified by the currency code posted.

Example:
150.2
transactionReference
string
required
The merchant's reference for the transaction. This reference can be used to look up the transaction with the GetTransactionByReference operation.

<= 50 characters
bankReference
string
required
The reference that will be pre-populated in the "their reference" field in the customers online banking site. This is the payment reference that appears on the merchant’s bank statement and can be used for recon purposes. Only alphanumeric characters, spaces, and dashes are allowed.

<= 20 characters
optional1
string
Optional field the merchant can post for additional information they would need passed back in the response. These are also stored with the transaction details by Ozow, and can be useful for filtering transactions in the merchant admin section.

<= 50 characters
optional2
string
Optional field the merchant can post for additional information they would need passed back in the response. These are also stored with the transaction details by Ozow, and can be useful for filtering transactions in the merchant admin section.

<= 50 characters
optional3
string
Optional field the merchant can post for additional information they would need passed back in the response. These are also stored with the transaction details by Ozow, and can be useful for filtering transactions in the merchant admin section.

<= 50 characters
optional4
string
Optional field the merchant can post for additional information they would need passed back in the response. These are also stored with the transaction details by Ozow, and can be useful for filtering transactions in the merchant admin section.

<= 50 characters
optional5
string
Optional field the merchant can post for additional information they would need passed back in the response. These are also stored with the transaction details by Ozow, and can be useful for filtering transactions in the merchant admin section.

<= 50 characters
customer
string
The customer’s name or identifier.

<= 100 characters
cancelUrl
string<uri>
The URL to which the redirect result should be posted to if the customer cancels the payment. This is also the page the customer will be redirected to. This URL can also be set for the applicable merchant site in the merchant admin section. If a value is set in the merchant admin and sent in the post, the posted value will be redirected to if the payment is cancelled.

<= 150 characters
errorUrl
string<uri>
The URL to which the redirect result should be posted if an error occurs while trying to process the payment. This is also the page the customer will be redirected to. This URL can also be set for the applicable merchant site in the merchant admin section. If a value is set in the merchant admin and sent in the post, the posted value will be redirected to if an error occurred while processing the payment.

<= 150 characters
successUrl
string<uri>
The URL to which the redirect result should be posted to if the payment is successful. This is also be the page the customer gets redirected to. This URL can also be set for the applicable merchant site in the merchant admin section. If a value is set in the merchant admin and sent in the post, the posted value will be redirected to if the payment was successful.

Please note that it is not sufficient to assume that the payment was successful simply because the customer has been redirected back to this page. It is highly recommended that you check the response fields as well as the transaction status using our check transaction status API call.

<= 150 characters
notifyUrl
string<uri>
The URL that the notification result should be posted to. The result will post regardless of the outcome of the transaction. This URL can also be set for the applicable merchant site in the merchant admin section. If a value is set in the merchant admin and sent in the post, the notification result will be sent to the posted value. Find out more in the notification response section in step 2.

<= 150 characters
isTest
boolean
required
Accepted values are true or false. Send true to test your request posting and response handling. If set to true you will be redirected to select whether you would like a successful or unsuccessful redirect response sent back.

Please note that notification responses are sent for test transactions and the online banking payment is skipped.

selectedBankId
string<uuid>
If the 'SelectedBankId' field is populated by the Merchant, the Customer will be redirected to the Ozow login page of the selected bank. However, if the field is left empty, the Customer will be presented with Ozow bank selection screen.

Please reference the accepted bank list for possible values.

bankAccountNumber
string
The bank account number the payment should be made to.

<= 20 characters
branchCode
string
The branch code for the bank account.

<= 10 characters
bankAccountName
string
The name to be used for the bank account. Only alphanumeric characters and spaces allowed.

<= 50 characters
Example:
405264466544
Match pattern:
^[0-9 ]+
payeeDisplayName
string
The name shown on the site as the entity being paid (not in banking screens).

<= 50 characters
expiryDateUtc
string
Payment will not be allowed to be made after this date. Date should be UTC and value should be formatted as yyyy-MM-dd HH:mm

<= 19 characters
Example:
2015-08-11 16:02
allowVariableAmount
boolean
Allows the user to change the amount passed through before paying. This option must also be enabled for the site in the merchant admin portal to be used. Accepted values are true or false. DO NOT include false in the hash check string, just ignore instead.

variableAmountMin
number<double>
If AllowVariableAmount is passed through as true, this will dictate the lowest acceptable amount the user can enter.

Example:
1
variableAmountMax
number<double>
If AllowVariableAmount is passed through as true, this will dictate the highest acceptable amount the user can enter.

Example:
150
customerIdentifier
string
Merchants classified as high-risk must provide a valid South African identity number. It's important to note that this is an optional field for all other merchants. For more details see Capitec High Risk Integration, or reach out to .

<= 13 characters
Example:
8007897546456
customerCellphoneNumber
string
Merchant can provide customer cellphone number for faster login on certain banks. DO NOT include in the hash check string, just ignore instead.

<= 10 characters
Example:
0794567855
Match pattern:
^[0-9]+
hashCheck
string
required
SHA512 hash used to ensure that certain fields in the message have not been altered after the hash was generated. Please see the generate hash section for more details on how to generate the hash.

<= 250 characters
Generate post hash check
Follow these steps to generate the hash check:

Concatenate the post variables (excluding HashCheck and Token) in the order they appear in the post variables table.
Append your private key to the concatenated string. Your private key can be found in merchant details section of the merchant admin site.
Convert the concatenated string to lowercase.
Generate a SHA512 hash of the lowercase concatenated string.
Hash check example
SiteCode: TSTSTE0001
CountryCode: ZA
CurrencyCode: ZAR
Amount: 25.00
TransactionReference: 123
BankReference: ABC123
CancelUrl: http://demo.ozow.com/cancel.aspx
ErrorUrl: http://demo.ozow.com/error.aspx
SuccessUrl: http://demo.ozow.com/success.aspx
NotifyUrl: http://demo.ozow.com/notify.aspx
IsTest: false
TSTSTE0001ZAZAR25.00123ABC123http://demo.ozow.com/cancel.aspxhttp://demo.ozow.com/cancel.ashttp://demo.ozow.com/success.aspxhttp://demo.ozow.com/notify.aspxfalse
TSTSTE0001ZAZAR25.00123ABC123http://demo.ozow.com/cancel.aspxhttp://demo.ozow.com/cancel.aspxhttp://demo.ozow.com/success.aspxhttp://demo.ozow.com/notify.aspxfalse[YOUR PRIVATE KEY]
tstste0001zazar25.00123abc123[http://demo.ozow.com/cancel.aspxhttp://demo.ozow.com/cancel.aspxht]http://demo.ozow.com/success.aspx(http://demo.ozow.com/notify.aspxfalse[your private key]
eedcba106cd8fef3ba6cec5ec80de7d7d7fc90343028bf95b908718c671d0fe885ca08b206d788de009d237a93c18e66edf6ede3f5ca7057e23474106465dcc6
csharp
php
javascript
python
using System.Security.Cryptography;
using System.Text;
using System;

GenerateRequestHash();

void GenerateRequestHash()
{
	string siteCode = "[YOUR SITE CODE]";
	string countryCode = "ZA";
	string currencyCode = "ZAR";
	decimal amount = 25.01M;
	string transactionReference = "123";
	string bankReference = "ABC123";
	string cancelUrl = "http://mydomain.com/cancel.html";
	string errorUrl = "http://mydomain.com/error.html";
	string successUrl = "http://mydomain.com/success.html";
	string notifyUrl = "http://mydomain/notify.html";
	string privateKey = "[YOUR PRIVATE KEY]";
	bool isTest = false;

	string inputString = string.Concat(siteCode, countryCode, currencyCode, amount, transactionReference, bankReference, cancelUrl, errorUrl, successUrl, notifyUrl, isTest, privateKey);

	string calculatedHashResult = GenerateRequestHashCheck(inputString);
	Console.WriteLine($"Hashcheck: {calculatedHashResult}");
}

string GenerateRequestHashCheck(string inputString)
{
	var stringToHash = inputString.ToLower();
	Console.WriteLine($"Before Hashcheck: {stringToHash}");
	return GetSha512Hash(stringToHash);
}

string GetSha512Hash(string stringToHash)
{
	using (SHA512 alg = new SHA512CryptoServiceProvider())
	{
		var bytes = alg.ComputeHash(Encoding.UTF8.GetBytes(stringToHash));
		var sb = new StringBuilder();
		foreach (var b in bytes)
		{
			var hex = b.ToString("x2");
			sb.Append(hex);
		}

		return sb.ToString();
	}
}
Generate payment URL using API
https://api.ozow.com/PostPaymentRequest

API Reference

Property	Type	Required	Description
ApiKey (HTTP request header value)	String (50)	Yes	Merchant's API key, this value is available in the Ozow merchant admin section.
Content-Type (HTTP request header value)	String (50)	Yes	Format of your post data object. Available values:
• application/json – post data object is a JSON string
• application/xml - post data object is a XML string
Accept (HTTP request header value)	String (50)	Yes	Determines the format the response is returned in. Available values:
• application/json - Response is returned as JSON
• application/xml - Response is returned as XML
Post data object	String (JSON / XML)	Yes	As per schema described above.

If you are using this to generate a link that will be used for SMS, email or for QR codes you need to pass an extra Boolean variable in the post data object i.e. GenerateShortUrl with a value of true. This extra field should not be used to generate the hash. e.g. { …, " GenerateShortUrl ": true }
csharp
php
javascript
python
var client = new RestClient("https://api.ozow.com/postpaymentrequest");
client.Timeout = -1;
var request = new RestRequest(Method.POST);
request.AddHeader("Accept", "application/json");
request.AddHeader("ApiKey", "[API KEY HERE]");
request.AddHeader("Content-Type", "application/json");

var data = new
{
	countryCode = "ZA",
	amount = "0.01",
	transactionReference = "Test1",
	bankReference = "Test1",
	cancelUrl = "http://test.i-pay.co.za/responsetest.php",
	currencyCode = "ZAR",
	errorUrl = "http://test.i-pay.co.za/responsetest.php",
	isTest = false,
	notifyUrl = "http://test.i-pay.co.za/responsetest.php",
	siteCode = "[YOUR SITECODE]",
	successUrl = "http://test.i-pay.co.za/responsetest.php",
	hashCheck = "[GENERATED HASH]"
};

var json = JsonConvert.SerializeObject(data);
request.AddParameter("application/json", json, ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
Console.WriteLine(response.Content);
Response
API Reference

PaymentRequestResult - A successful call will return a PaymentRequestResult object. The PaymentRequestResult object is described below.

PaymentRequestResult
Response to creating a payment request.

paymentRequestId
string<uuid>
required
Ozow's unique identifier for the payment request.

<= 50 characters
Example:
00000000-0000-0000-0000-000000000000
url
string<uri>
required
Generated URL that allows payment for the request used to create the payment. You will need to redirect the payer to this URL, who upon completion of the payment will be redirected back to your site.

The payment Url you'll receive from the API is dynamic. Please do not hard code it into your integrations as it might change.

<= 100 characters
Example:
https://pay.ozow.com/00000000-0000-0000-0000-000000000000/Secure
errorMessage
string
Error message generated when validating the request.

<= 50 characters
Sample response

{
    "paymentRequestId": "00000000-0000-0000-0000-000000000000",
    "url": "https://pay.ozow.com/00000000-0000-0000-0000-000000000000/Secure",
    "errorMessage": null
}