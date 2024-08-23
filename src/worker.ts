// import parser from 'xml2json';
const parseString = require('xml2js').parseString;
// const eyes = require('eyes');

import { v4 } from 'uuid';

const LOCATION_ID = 'l8NO0VX6lnHbN8I3ESx4';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
        },
      });
    }
    try {
      let body = await request.text();

      var xml = body;

      let _xml = {} as any;
      // console.log('XML', xml);
      await parseString(
        xml,
        async function (error: any, result: any) {
          if (error) {
            console.log('ERROR', error.message);
            throw new Error(error.message);
          }
          console.log('RESULT', result);
          _xml = result;
        }
      );

      if (!_xml) {
        throw new Error('XML does not exist');
      }

      let obj = _xml.adf.prospect[0];
      let vehicle = obj.vehicle[0];
      let contact = obj.customer[0].contact[0];
      let _address = contact.address[0];
      let address = {} as any;

      Object.keys(_address).forEach((key) => {
        if (key === '$') {
          address.type = _address.$.type;
        } else if (typeof _address[key].length === 'number') {
          address[key] = _address[key][0];
        }
      });

      let _colorCombination = vehicle.colorcombination[0];

      let colorCombination = {} as any;

      Object.keys(_colorCombination).forEach((key) => {
        colorCombination[key] =
          _colorCombination[key].join(', ');
      });

      let prospect = {} as any;
      prospect.id = obj.id[0]._;

      prospect.requestDate = obj.requestdate[0];

      prospect.vehicle = {
        id: vehicle.id[0],
        interest: vehicle.$.interest,
        status: vehicle.$.status,
        year: vehicle.year[0],
        make: vehicle.make[0],
        model: vehicle.model[0],
        vin: vehicle.vin[0],
        trim: vehicle.trim[0],
        odometer: {
          mileage: vehicle.odometer[0]._,
          isInMiles: vehicle.odometer[0].$.units === 'mi',
        },
        price: {
          value: vehicle.price[0]._,
          isInUsd: vehicle.price[0].$.currency === 'USD',
          type: vehicle.price[0].$.type,
        },
        colorCombination,
        comments: vehicle.comments[0],
      };

      prospect.contact = {
        firstName: contact.name[0]._,
        lastName: contact.name[1]._,
        phone: contact.phone[0],
        email: contact.email[0],
        address,
        comments: obj.customer[0].comments[0],
      };

      if (!prospect.contact.email && !prospect.contact.phone) {
        prospect.contact.email = `no-contact-info-${v4().slice(
          10
        )}@email.com`;
      }

      // Output
      // console.log(prospect);

      // Verbose output
      // console.log(eyes.inspect(prospect));

      function getRange(input: any) {
        const str = input.split('Notes:')[1];
        let regex = /(\w+): (\d+)/g;

        let match;
        let result: any = {};

        while ((match = regex.exec(str)) !== null) {
          result[match[1]] = parseInt(match[2]);
        }

        return result;
      }

      prospect.contact.range = getRange(
        prospect.contact.comments
      );

      const regex = /SourceLink:\s*(https?:\/\/[^\s]+)/; // Regular expression to capture the URL after "SourceLink:"

      // console.log('HIER 1', prospect);
      // console.log('HIER 2', prospect?.contact);
      // console.log('HIER 3', prospect?.contact?.comments);
      const source =
        prospect?.contact?.comments?.match(regex)?.[1];
      console.log('SOURCE', source);
      prospect.source = source;
      console.log('PROSPECT', prospect);

      await fetch(
        'https://hook.us1.make.com/pe8jvlgmii48ohnox69u28jqlpf0ktk7',
        {
          method: 'POST',
          body: JSON.stringify(prospect),
          headers: { 'Content-Type': 'application/json' },
        }
      )
        .then((res) => res.text())
        .catch((error) => {
          throw new Error(error.message);
        });

      return new Response(`Accepted`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    } catch (error: any) {
      console.error(error);
      return new Response(error.stack, { status: 400 });
    }
  },
};
